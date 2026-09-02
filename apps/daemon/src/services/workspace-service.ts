import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, glob, mkdir, mkdtemp, realpath, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  type RunInputContextReference,
  UserContextReferenceKind,
} from "@pi-harness/agent-runtime/user-input";
import { isPathWithin, resolveWorkspacePath } from "@pi-harness/policy";
import {
  hasIgnoredWorkspaceDirectory,
  SkillRegistry,
  SkillScope,
  type SkillScope as SkillScopeValue,
  type WritableSkillScope,
} from "@pi-harness/tools";
import type { InstallWorkspaceSkillDto } from "../dto/workspace-dto.js";
import type {
  AppSettingRepository,
  WorkspaceRecord,
  WorkspaceRepository,
} from "../storage/database.js";

const PICKER_TIMEOUT_MS = 5 * 60 * 1_000;
const REVEAL_TIMEOUT_MS = 10_000;
const SKILL_INSTALL_TIMEOUT_MS = 5 * 60 * 1_000;
const SKILL_INSTALL_MAX_BUFFER_BYTES = 1024 * 1024;
const SKILLS_CLI_PACKAGE = "skills@1.5.23";
const GITHUB_SHORTHAND_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9])?\/[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9])?$/;
const MAX_CONTEXT_ITEMS = 500;
const MAX_CONTEXT_CANDIDATES = 2_000;
const IMAGE_FILE_EXTENSIONS = new Set(["gif", "jpeg", "jpg", "png", "webp"]);

const WorkspaceErrorCode = {
  INVALID: "WORKSPACE_INVALID",
  NOT_FOUND: "WORKSPACE_NOT_FOUND",
  PICKER_BUSY: "WORKSPACE_PICKER_BUSY",
  PICKER_FAILED: "WORKSPACE_PICKER_FAILED",
  PICKER_UNAVAILABLE: "WORKSPACE_PICKER_UNAVAILABLE",
  OPEN_FAILED: "WORKSPACE_OPEN_FAILED",
  OPEN_UNAVAILABLE: "WORKSPACE_OPEN_UNAVAILABLE",
  REVEAL_FAILED: "WORKSPACE_REVEAL_FAILED",
  REVEAL_UNAVAILABLE: "WORKSPACE_REVEAL_UNAVAILABLE",
  SKILL_INSTALL_CONFLICT: "SKILL_INSTALL_CONFLICT",
  SKILL_INSTALL_FAILED: "SKILL_INSTALL_FAILED",
  SKILL_INSTALL_INVALID: "SKILL_INSTALL_INVALID",
  SKILL_INSTALL_UNAVAILABLE: "SKILL_INSTALL_UNAVAILABLE",
} as const;

export type WorkspaceErrorCode = (typeof WorkspaceErrorCode)[keyof typeof WorkspaceErrorCode];

export class WorkspaceServiceError extends Error {
  public constructor(
    public readonly code: WorkspaceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceServiceError";
  }
}

function readPickerCommand(): { args: readonly string[]; command: string } {
  if (process.platform === "darwin") {
    return {
      args: ["-e", 'POSIX path of (choose folder with prompt "选择工作区目录")'],
      command: "/usr/bin/osascript",
    };
  }

  if (process.platform === "win32") {
    return {
      args: [
        "-NoProfile",
        "-NonInteractive",
        "-STA",
        "-Command",
        "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }",
      ],
      command: "powershell.exe",
    };
  }

  if (process.platform === "linux") {
    return {
      args: ["--file-selection", "--directory", "--title=选择工作区目录"],
      command: "zenity",
    };
  }

  throw new WorkspaceServiceError(
    WorkspaceErrorCode.PICKER_UNAVAILABLE,
    "当前操作系统不支持目录选择器",
  );
}

function isPickerCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (process.platform === "darwin") return error.message.includes("(-128)");
  return process.platform === "linux" && "code" in error && error.code === 1;
}

function isCommandUnavailable(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function runPicker(signal: AbortSignal): Promise<string> {
  const { args, command } = readPickerCommand();
  return new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      { encoding: "utf8", maxBuffer: 4_096, signal, timeout: PICKER_TIMEOUT_MS },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      },
    );
  });
}

function readRevealCommand(rootPath: string): { args: readonly string[]; command: string } {
  if (process.platform === "darwin") {
    return { args: ["-R", rootPath], command: "/usr/bin/open" };
  }
  if (process.platform === "win32") {
    return { args: [`/select,${rootPath}`], command: "explorer.exe" };
  }
  if (process.platform === "linux") {
    return { args: [rootPath], command: "xdg-open" };
  }
  throw new WorkspaceServiceError(
    WorkspaceErrorCode.REVEAL_UNAVAILABLE,
    "当前操作系统不支持显示工作区目录",
  );
}

function runReveal(rootPath: string, signal: AbortSignal): Promise<void> {
  const { args, command } = readRevealCommand(rootPath);
  return new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      { maxBuffer: 4_096, signal, timeout: REVEAL_TIMEOUT_MS },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}

function readOpenCommand(path: string): { args: readonly string[]; command: string } {
  if (process.platform === "darwin") return { args: [path], command: "/usr/bin/open" };
  if (process.platform === "win32") {
    return {
      args: ["-NoProfile", "-NonInteractive", "-Command", "Start-Process -FilePath $args[0]", path],
      command: "powershell.exe",
    };
  }
  if (process.platform === "linux") return { args: [path], command: "xdg-open" };
  throw new WorkspaceServiceError(
    WorkspaceErrorCode.OPEN_UNAVAILABLE,
    "当前操作系统不支持打开本地文件",
  );
}

function runOpen(path: string, signal: AbortSignal): Promise<void> {
  const { args, command } = readOpenCommand(path);
  return new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      { maxBuffer: 4_096, signal, timeout: REVEAL_TIMEOUT_MS },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}

function normalizeSkillSource(input: string): string {
  const source = input.trim();
  if (GITHUB_SHORTHAND_PATTERN.test(source)) return source;

  try {
    const url = new URL(source);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname.split("/").filter(Boolean).length < 2
    ) {
      throw new Error("Invalid GitHub source");
    }
    return url.toString();
  } catch {
    throw new WorkspaceServiceError(
      WorkspaceErrorCode.SKILL_INSTALL_INVALID,
      "请输入 owner/repo 或有效的 GitHub Skill 地址",
    );
  }
}

function skillInstallEnvironment(): NodeJS.ProcessEnv {
  const names = [
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "HOME",
    "LANG",
    "LC_ALL",
    "PATH",
    "TMPDIR",
    "USER",
  ] as const;
  return {
    ...Object.fromEntries(
      names.flatMap((name) => {
        const value = process.env[name];
        return value === undefined ? [] : [[name, value]];
      }),
    ),
    DISABLE_TELEMETRY: "1",
  };
}

function runSkillInstaller(
  cwd: string,
  source: string,
  skillName: string | undefined,
  signal: AbortSignal,
): Promise<void> {
  const args = [
    "dlx",
    SKILLS_CLI_PACKAGE,
    "add",
    source,
    "--agent",
    "codex",
    "--copy",
    "--yes",
    ...(skillName ? ["--skill", skillName] : []),
  ];

  return new Promise((resolvePromise, rejectPromise) => {
    execFile(
      "pnpm",
      args,
      {
        cwd,
        encoding: "utf8",
        env: skillInstallEnvironment(),
        maxBuffer: SKILL_INSTALL_MAX_BUFFER_BYTES,
        signal,
        timeout: SKILL_INSTALL_TIMEOUT_MS,
        windowsHide: true,
      },
      (error) => {
        if (error) rejectPromise(error);
        else resolvePromise();
      },
    );
  });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function isWorkspaceAvailable(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function installStagedSkills(
  stagedSkills: readonly { directory: string; name: string }[],
  targetRoot: string,
): Promise<void> {
  await mkdir(targetRoot, { mode: 0o700, recursive: true });
  const canonicalTargetRoot = await realpath(targetRoot);
  const destinations = stagedSkills.map((skill) => ({
    destination: resolve(canonicalTargetRoot, skill.name),
    skill,
  }));

  for (const { destination } of destinations) {
    if (!isPathWithin(canonicalTargetRoot, destination)) {
      throw new WorkspaceServiceError(
        WorkspaceErrorCode.SKILL_INSTALL_INVALID,
        "Skill 安装路径越界",
      );
    }
    if (await pathExists(destination)) {
      throw new WorkspaceServiceError(
        WorkspaceErrorCode.SKILL_INSTALL_CONFLICT,
        "存在同名 Skill，请先卸载或更换名称",
      );
    }
  }

  const created: string[] = [];
  const pending: string[] = [];
  try {
    for (const { destination, skill } of destinations) {
      const temporaryDestination = `${destination}.installing-${randomUUID()}`;
      pending.push(temporaryDestination);
      await cp(skill.directory, temporaryDestination, {
        errorOnExist: true,
        force: false,
        recursive: true,
      });
      await rename(temporaryDestination, destination);
      pending.pop();
      created.push(destination);
    }
  } catch (error: unknown) {
    await Promise.all([
      ...pending.map((path) => rm(path, { force: true, recursive: true })),
      ...created.map((path) => rm(path, { force: true, recursive: true })),
    ]);
    throw error;
  }
}

async function resolveGlobalSkillInstallRoot(globalRoot: string): Promise<string> {
  const canonicalGlobalRoot = await realpath(globalRoot);
  const targetRoot = resolve(canonicalGlobalRoot, "skills");
  if (!isPathWithin(canonicalGlobalRoot, targetRoot)) {
    throw new WorkspaceServiceError(
      WorkspaceErrorCode.SKILL_INSTALL_INVALID,
      "全局 Skill 安装路径越界",
    );
  }
  await mkdir(targetRoot, { mode: 0o700, recursive: true });
  const canonicalTargetRoot = await realpath(targetRoot);
  if (!isPathWithin(canonicalGlobalRoot, canonicalTargetRoot)) {
    throw new WorkspaceServiceError(
      WorkspaceErrorCode.SKILL_INSTALL_INVALID,
      "拒绝通过符号链接安装到全局 Skill 目录外",
    );
  }
  return canonicalTargetRoot;
}

async function resolveWorkspaceRoot(input: string): Promise<string> {
  try {
    const rootPath = await realpath(input);
    if (!(await stat(rootPath)).isDirectory()) throw new Error("Workspace is not a directory");
    return rootPath;
  } catch {
    throw new WorkspaceServiceError(
      WorkspaceErrorCode.INVALID,
      "Workspace 目录不存在或无法访问，可能已被移动或重命名",
    );
  }
}

async function resolveOpenablePath(path: string, workspaceRoot: string): Promise<string> {
  const requestedPath = path.trim();
  if (!requestedPath) throw new Error("Path is empty");
  const target = isAbsolute(requestedPath) ? requestedPath : resolve(workspaceRoot, requestedPath);
  try {
    return await realpath(target);
  } catch (error: unknown) {
    if (!requestedPath.startsWith("project/")) throw error;
    return realpath(resolve(workspaceRoot, requestedPath.slice("project/".length)));
  }
}

export class WorkspaceService {
  private activePickerController: AbortController | null = null;

  public constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly globalRoot: string,
    private readonly settings: AppSettingRepository,
  ) {}

  public async list() {
    return Promise.all(
      this.workspaces.list().map(async (workspace) => ({
        ...workspace,
        isAvailable: await isWorkspaceAvailable(workspace.rootPath),
      })),
    );
  }

  public async listContextItems(
    workspaceId: string,
    signal?: AbortSignal,
  ): Promise<readonly RunInputContextReference[]> {
    const workspaceRoot = this.getRequired(workspaceId).rootPath;
    const items = new Map<string, RunInputContextReference>();

    for await (const entry of glob("**/*", {
      cwd: workspaceRoot,
      exclude: (candidate) =>
        hasIgnoredWorkspaceDirectory(
          relative(workspaceRoot, resolve(candidate.parentPath, candidate.name)),
        ),
      withFileTypes: true,
    })) {
      if (signal?.aborted) throw signal.reason ?? new Error("Workspace 上下文扫描已取消");
      const absolutePath = resolve(entry.parentPath, entry.name);
      const workspacePath = relative(workspaceRoot, absolutePath);
      if (
        !workspacePath ||
        workspacePath === ".." ||
        workspacePath.startsWith(`..${sep}`) ||
        hasIgnoredWorkspaceDirectory(workspacePath)
      ) {
        continue;
      }

      try {
        await resolveWorkspacePath({ path: absolutePath, workspaceRoot });
      } catch {
        continue;
      }

      const normalizedPath = workspacePath.split(sep).join("/");
      const extension = entry.isFile()
        ? entry.name.split(".").at(-1)?.toLocaleLowerCase()
        : undefined;
      const kind = entry.isDirectory()
        ? UserContextReferenceKind.FOLDER
        : extension && IMAGE_FILE_EXTENSIONS.has(extension)
          ? UserContextReferenceKind.IMAGE
          : entry.isFile()
            ? UserContextReferenceKind.FILE
            : null;
      if (kind === null) continue;
      items.set(normalizedPath, { kind, path: normalizedPath });
      if (items.size === MAX_CONTEXT_CANDIDATES) break;
    }

    return [...items.values()]
      .toSorted(
        (left, right) =>
          left.path.split("/").length - right.path.split("/").length ||
          left.path.localeCompare(right.path),
      )
      .slice(0, MAX_CONTEXT_ITEMS);
  }

  public async listSkills(workspaceId: string) {
    const disabledDirectories = new Set(this.settings.getDisabledSkillDirectories());
    const registry = await this.createSkillRegistry(workspaceId);
    return (await registry.discoverListItems()).map((skill) => ({
      description: skill.description,
      directory: skill.directory,
      id: skill.id,
      isEnabled:
        skill.scope === SkillScope.SYSTEM ||
        (skill.directory !== null && !disabledDirectories.has(skill.directory)),
      name: skill.name,
      scope: skill.scope,
    }));
  }

  public async installSkill(
    workspaceId: string,
    input: InstallWorkspaceSkillDto,
    signal: AbortSignal,
  ): Promise<{ installedSkillNames: string[] }> {
    this.getRequired(workspaceId);
    const source = normalizeSkillSource(input.source);
    const stagingRoot = await mkdtemp(join(tmpdir(), "pi-harness-skill-install-"));

    try {
      await runSkillInstaller(stagingRoot, source, input.skillName, signal);
      const stagedSkills = (
        await new SkillRegistry({
          globalRoot: stagingRoot,
          workspaceRoot: stagingRoot,
        }).discoverListItems()
      ).flatMap((skill) =>
        skill.scope === SkillScope.PROJECT && skill.directory
          ? [{ directory: skill.directory, name: skill.name }]
          : [],
      );
      if (stagedSkills.length === 0) {
        throw new WorkspaceServiceError(
          WorkspaceErrorCode.SKILL_INSTALL_INVALID,
          "来源中没有找到有效的 Skill",
        );
      }

      const targetRoot = await resolveGlobalSkillInstallRoot(this.globalRoot);
      await installStagedSkills(stagedSkills, targetRoot);
      return { installedSkillNames: stagedSkills.map((skill) => skill.name).sort() };
    } catch (error: unknown) {
      if (error instanceof WorkspaceServiceError || signal.aborted) throw error;
      if (isCommandUnavailable(error)) {
        throw new WorkspaceServiceError(
          WorkspaceErrorCode.SKILL_INSTALL_UNAVAILABLE,
          "当前系统缺少 pnpm，无法运行 Skill 安装器",
        );
      }
      throw new WorkspaceServiceError(
        WorkspaceErrorCode.SKILL_INSTALL_FAILED,
        "Skill 安装失败，请检查 GitHub 来源、网络连接或访问权限",
      );
    } finally {
      await rm(stagingRoot, { force: true, recursive: true });
    }
  }

  public async getSkillContent(workspaceId: string, name: string, scope: SkillScopeValue) {
    const skill = await (await this.createSkillRegistry(workspaceId)).load(name, scope);
    return { content: skill.content };
  }

  public async setSkillEnabled(
    workspaceId: string,
    name: string,
    scope: WritableSkillScope,
    isEnabled: boolean,
  ): Promise<void> {
    const skill = await (await this.createSkillRegistry(workspaceId)).get(name, scope);
    if (skill.directory === null) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "系统 Skill 不可停用");
    }
    const disabledDirectories = new Set(this.settings.getDisabledSkillDirectories());
    if (isEnabled) disabledDirectories.delete(skill.directory);
    else disabledDirectories.add(skill.directory);
    this.settings.setDisabledSkillDirectories([...disabledDirectories].sort(), Date.now());
  }

  public async removeSkill(
    workspaceId: string,
    name: string,
    scope: WritableSkillScope,
  ): Promise<void> {
    const registry = await this.createSkillRegistry(workspaceId);
    const skill = await registry.get(name, scope);
    if (skill.directory === null) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "系统 Skill 不可卸载");
    }
    await registry.remove(name, scope);
    const disabledDirectories = new Set(this.settings.getDisabledSkillDirectories());
    if (disabledDirectories.delete(skill.directory)) {
      this.settings.setDisabledSkillDirectories([...disabledDirectories].sort(), Date.now());
    }
  }

  public async openSkillDirectory(
    workspaceId: string,
    name: string,
    scope: WritableSkillScope,
    signal: AbortSignal,
  ): Promise<void> {
    const skill = await (await this.createSkillRegistry(workspaceId)).get(name, scope);
    if (skill.directory === null) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "系统 Skill 没有本地目录");
    }
    await this.openTarget(skill.directory, signal);
  }

  public remove(workspaceId: string): void {
    this.getRequired(workspaceId);
    if (!this.workspaces.remove(workspaceId, Date.now())) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.NOT_FOUND, "Workspace 不存在");
    }
  }

  public async reorder(workspaceIds: readonly string[]) {
    const activeWorkspaceIds = new Set(this.workspaces.list().map((workspace) => workspace.id));
    if (
      workspaceIds.length !== activeWorkspaceIds.size ||
      workspaceIds.some((workspaceId) => !activeWorkspaceIds.delete(workspaceId)) ||
      activeWorkspaceIds.size > 0
    ) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "Workspace 顺序已变化，请重试");
    }

    this.workspaces.reorder(workspaceIds, Date.now());
    return this.list();
  }

  public async openPath(workspaceId: string, path: string, signal: AbortSignal): Promise<void> {
    const workspace = this.getRequired(workspaceId);
    let target: string;
    try {
      target = await resolveOpenablePath(path, workspace.rootPath);
    } catch {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "本地路径不存在或无法访问");
    }

    await this.openTarget(target, signal);
  }

  public async reveal(workspaceId: string, signal: AbortSignal): Promise<void> {
    const workspace = this.getRequired(workspaceId);
    try {
      await runReveal(workspace.rootPath, signal);
    } catch (error: unknown) {
      if (signal.aborted) return;
      if (error instanceof WorkspaceServiceError) throw error;
      if (isCommandUnavailable(error)) {
        throw new WorkspaceServiceError(
          WorkspaceErrorCode.REVEAL_UNAVAILABLE,
          "当前系统缺少可用的文件管理器",
        );
      }
      throw new WorkspaceServiceError(
        WorkspaceErrorCode.REVEAL_FAILED,
        "无法在文件管理器中显示 Workspace",
      );
    }
  }

  public async select(requestSignal: AbortSignal) {
    if (this.activePickerController) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.PICKER_BUSY, "已有目录选择器正在等待操作");
    }

    const pickerController = new AbortController();
    this.activePickerController = pickerController;
    const signal = AbortSignal.any([requestSignal, pickerController.signal]);

    try {
      const selectedPath = await runPicker(signal);
      if (!selectedPath) return null;
      const workspace = this.workspaces.create(
        await resolveWorkspaceRoot(selectedPath),
        Date.now(),
      );
      return { ...workspace, isAvailable: true };
    } catch (error: unknown) {
      if (signal.aborted || isPickerCancellation(error)) return null;
      if (error instanceof WorkspaceServiceError) throw error;
      if (isCommandUnavailable(error)) {
        throw new WorkspaceServiceError(
          WorkspaceErrorCode.PICKER_UNAVAILABLE,
          "当前系统缺少可用的目录选择器",
        );
      }
      throw new WorkspaceServiceError(WorkspaceErrorCode.PICKER_FAILED, "打开目录选择器失败");
    } finally {
      if (this.activePickerController === pickerController) this.activePickerController = null;
    }
  }

  public async updateName(workspaceId: string, name: string) {
    this.getRequired(workspaceId);
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "Workspace 名称不能为空");
    }
    const workspace = this.workspaces.updateName(workspaceId, normalizedName, Date.now());
    if (!workspace) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.NOT_FOUND, "Workspace 不存在");
    }
    return { ...workspace, isAvailable: await isWorkspaceAvailable(workspace.rootPath) };
  }

  public close(): void {
    this.activePickerController?.abort();
  }

  private getRequired(workspaceId: string): WorkspaceRecord {
    const workspace = this.workspaces.find(workspaceId);
    if (!workspace || workspace.removedAt !== null) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.NOT_FOUND, "Workspace 不存在");
    }
    return workspace;
  }

  private async createSkillRegistry(workspaceId: string): Promise<SkillRegistry> {
    return new SkillRegistry({
      globalRoot: this.globalRoot,
      workspaceRoot: await resolveWorkspaceRoot(this.getRequired(workspaceId).rootPath),
    });
  }

  private async openTarget(target: string, signal: AbortSignal): Promise<void> {
    try {
      await runOpen(target, signal);
    } catch (error: unknown) {
      if (signal.aborted) return;
      if (error instanceof WorkspaceServiceError) throw error;
      if (isCommandUnavailable(error)) {
        throw new WorkspaceServiceError(
          WorkspaceErrorCode.OPEN_UNAVAILABLE,
          "当前系统缺少可用的本地路径打开程序",
        );
      }
      throw new WorkspaceServiceError(WorkspaceErrorCode.OPEN_FAILED, "无法打开本地路径");
    }
  }
}
