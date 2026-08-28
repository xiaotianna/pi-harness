import { execFile } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { SkillRegistry, type SkillSummary } from "@pi-harness/tools";
import type { WorkspaceRecord, WorkspaceRepository } from "../storage/database.js";

const PICKER_TIMEOUT_MS = 5 * 60 * 1_000;
const REVEAL_TIMEOUT_MS = 10_000;

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

async function resolveWorkspaceRoot(input: string): Promise<string> {
  try {
    const rootPath = await realpath(input);
    if (!(await stat(rootPath)).isDirectory()) throw new Error("Workspace is not a directory");
    return rootPath;
  } catch {
    throw new WorkspaceServiceError(
      WorkspaceErrorCode.INVALID,
      "Workspace 不存在或不是可访问的目录",
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
  ) {}

  public list(): readonly WorkspaceRecord[] {
    return this.workspaces.list();
  }

  public async listSkills(workspaceId: string): Promise<readonly SkillSummary[]> {
    const workspace = this.getRequired(workspaceId);
    return new SkillRegistry({
      globalRoot: this.globalRoot,
      workspaceRoot: workspace.rootPath,
    }).discover();
  }

  public remove(workspaceId: string): void {
    this.getRequired(workspaceId);
    if (!this.workspaces.remove(workspaceId, Date.now())) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.NOT_FOUND, "Workspace 不存在");
    }
  }

  public reorder(workspaceIds: readonly string[]): readonly WorkspaceRecord[] {
    const activeWorkspaceIds = new Set(this.workspaces.list().map((workspace) => workspace.id));
    if (
      workspaceIds.length !== activeWorkspaceIds.size ||
      workspaceIds.some((workspaceId) => !activeWorkspaceIds.delete(workspaceId)) ||
      activeWorkspaceIds.size > 0
    ) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "Workspace 顺序已变化，请重试");
    }

    this.workspaces.reorder(workspaceIds, Date.now());
    return this.workspaces.list();
  }

  public async openPath(workspaceId: string, path: string, signal: AbortSignal): Promise<void> {
    const workspace = this.getRequired(workspaceId);
    let target: string;
    try {
      target = await resolveOpenablePath(path, workspace.rootPath);
    } catch {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "本地路径不存在或无法访问");
    }

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

  public async select(requestSignal: AbortSignal): Promise<WorkspaceRecord | null> {
    if (this.activePickerController) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.PICKER_BUSY, "已有目录选择器正在等待操作");
    }

    const pickerController = new AbortController();
    this.activePickerController = pickerController;
    const signal = AbortSignal.any([requestSignal, pickerController.signal]);

    try {
      const selectedPath = await runPicker(signal);
      if (!selectedPath) return null;
      return this.workspaces.create(await resolveWorkspaceRoot(selectedPath), Date.now());
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

  public updateName(workspaceId: string, name: string): WorkspaceRecord {
    this.getRequired(workspaceId);
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.INVALID, "Workspace 名称不能为空");
    }
    const workspace = this.workspaces.updateName(workspaceId, normalizedName, Date.now());
    if (!workspace) {
      throw new WorkspaceServiceError(WorkspaceErrorCode.NOT_FOUND, "Workspace 不存在");
    }
    return workspace;
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
}
