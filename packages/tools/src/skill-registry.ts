import { isUtf8 } from "node:buffer";
import { createHash } from "node:crypto";
import { glob, mkdir, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { isPathWithin, matchesSkillTool, resolveWorkspacePath } from "@pi-harness/policy";
import { stringify } from "yaml";
import { skillCreatorSystemSkill } from "./skills/skill-creator.js";
import { skillInstallerSystemSkill } from "./skills/skill-installer.js";
import {
  type SkillDefinition,
  SkillScope,
  SkillType,
  type SkillType as SkillTypeValue,
} from "./skills/types.js";
import { detectImageMimeType, readRegularFile } from "./utils/media-file.js";
import {
  readSkillDocument,
  SKILL_NAME_PATTERN,
  type SkillFrontmatter,
} from "./utils/skill-document.js";

const MAX_SKILL_BYTES = 128 * 1024;
const MAX_RESOURCE_BYTES = 1024 * 1024;
const MAX_RESOURCES = 200;
const SYSTEM_SKILLS = [skillCreatorSystemSkill, skillInstallerSystemSkill];

function findSystemSkill(name: string) {
  return SYSTEM_SKILLS.find((skill) => skill.name === name);
}

export { SkillScope };
export type SkillScopeValue = SkillScope;
export type WritableSkillScope = typeof SkillScope.GLOBAL | typeof SkillScope.PROJECT;

export interface SkillSummary {
  collectionId: string | null;
  description: string;
  id: string;
  name: string;
  scope: SkillScope;
  type: SkillTypeValue;
}

export interface SkillListItem extends SkillSummary {
  directory: string | null;
}

export interface SkillDetails extends SkillListItem {
  frontmatter: SkillFrontmatter;
  resources: readonly string[];
  resourcesTruncated: boolean;
}

export interface LoadedSkill extends SkillDetails {
  image?: { data: string; mimeType: string; type: "image" };
  resourcePath?: string;
  size?: number;
  content: string;
  resource: string;
}

export interface CreateSkillInput {
  description: string;
  instructions: string;
  name: string;
  scope: WritableSkillScope;
}

export interface CreatedSkill {
  document: string;
  skill: SkillSummary;
}

interface SkillRecord extends SkillDetails {
  instructions: string;
}

interface FileSkillRecord extends SkillRecord {
  directory: string;
  scope: WritableSkillScope;
}

export interface SkillRegistryContext {
  getRegisteredGlobalSkills?: () => readonly SkillDefinition[];
  globalRoot: string;
  homeRoot?: string;
  isSkillEnabled?: (directory: string) => boolean;
  skillGatewayUrl?: string;
  workspaceRoot: string;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function skillId(scope: SkillScope, name: string): string {
  return `${scope}:${name}`;
}

function toDefinitionRecord(
  skill: SkillDefinition,
  skillGatewayUrl: string | undefined,
): SkillRecord {
  return {
    collectionId: skill.collectionId ?? null,
    description: skill.description,
    directory: skill.directory ?? null,
    frontmatter: skill.frontmatter ?? { name: skill.name, description: skill.description },
    id: skill.id,
    instructions: skill.instructions.replaceAll("{skillGatewayUrl}", skillGatewayUrl ?? ""),
    name: skill.name,
    resources: [],
    resourcesTruncated: false,
    scope: skill.scope,
    type: skill.type ?? SkillType.NONE,
  };
}

function toSummary({
  frontmatter: _frontmatter,
  directory: _directory,
  instructions: _instructions,
  resources: _resources,
  resourcesTruncated: _resourcesTruncated,
  ...skill
}: SkillRecord): SkillSummary {
  return skill;
}

function toDetails({ instructions: _instructions, ...skill }: SkillRecord): SkillDetails {
  return skill;
}

function toListItem({
  frontmatter: _frontmatter,
  instructions: _instructions,
  resources: _resources,
  resourcesTruncated: _resourcesTruncated,
  ...skill
}: SkillRecord): SkillListItem {
  return skill;
}

// SkillRegistry 负责发现、校验、查询、读取和创建 Skill
export class SkillRegistry {
  private readonly pendingGrants = new Map<string, string>();
  private readonly grants = new Map<string, SkillDetails & { fingerprint: string }>();

  public constructor(private readonly context: SkillRegistryContext) {}

  public clearGrants(): void {
    this.grants.clear();
    this.pendingGrants.clear();
  }

  public fingerprint(skill: LoadedSkill): string {
    return createHash("sha256")
      .update(JSON.stringify([skill.id, skill.directory, skill.frontmatter, skill.content]))
      .digest("hex");
  }

  public prepareGrant(skill: LoadedSkill): string {
    const fingerprint = this.fingerprint(skill);
    this.pendingGrants.set(skill.id, fingerprint);
    return fingerprint;
  }

  public grant(skill: LoadedSkill): void {
    const fingerprint = this.fingerprint(skill);
    if (
      skill.frontmatter["allowed-tools"]?.length &&
      this.pendingGrants.get(skill.id) !== fingerprint
    ) {
      throw new Error("SKILL_CHANGED: Skill 在审批后发生变化，请重新加载并申请授权");
    }
    this.pendingGrants.delete(skill.id);
    this.grants.set(skill.id, { ...skill, fingerprint });
  }

  public async isToolPreapproved(
    name: string,
    args: unknown,
    signal?: AbortSignal,
  ): Promise<boolean> {
    for (const grant of this.grants.values()) {
      signal?.throwIfAborted();
      const current = await this.load(grant.name, grant.scope, undefined, signal).catch(() => null);
      signal?.throwIfAborted();
      if (current === null || this.fingerprint(current) !== grant.fingerprint) {
        this.grants.delete(grant.id);
        continue;
      }
      if (matchesSkillTool(current.frontmatter["allowed-tools"], name, args)) return true;
    }
    return false;
  }

  // 扫描全部有效 Skill，返回简要信息
  public async discover(signal?: AbortSignal): Promise<readonly SkillSummary[]> {
    return (await this.discoverRecords(undefined, signal)).map(toSummary);
  }

  public async discoverListItems(): Promise<readonly SkillListItem[]> {
    return (await this.discoverRecords()).map(toListItem);
  }

  // 根据名称和描述搜索 Skill
  public async find(
    query: string,
    scope?: SkillScope,
    signal?: AbortSignal,
  ): Promise<readonly SkillSummary[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    return (await this.discoverRecords(scope, signal))
      .filter((skill) =>
        `${skill.name} ${skill.description}`.toLocaleLowerCase().includes(normalizedQuery),
      )
      .slice(0, 20)
      .map(toSummary);
  }

  // 获取 Skill 元数据和资源文件列表
  public async get(name: string, scope?: SkillScope, signal?: AbortSignal): Promise<SkillDetails> {
    return toDetails(await this.getRecord(name, scope, true, signal));
  }

  // 加载 SKILL.md 指令或指定资源内容
  public async load(
    name: string,
    scope?: SkillScope,
    resource?: string,
    signal?: AbortSignal,
  ): Promise<LoadedSkill> {
    signal?.throwIfAborted();
    const skill = await this.getRecord(name, scope, true, signal);
    signal?.throwIfAborted();
    const details = toDetails(skill);
    if (resource === undefined || resource === "SKILL.md") {
      return { ...details, content: skill.instructions, resource: "SKILL.md" };
    }
    if (skill.directory === null) throw new Error("SKILL_RESOURCE_INVALID: Skill 不包含本地资源");
    if (isAbsolute(resource) || resource.split(/[\\/]/).includes("..")) {
      throw new Error("SKILL_RESOURCE_INVALID: resource 必须是 Skill 目录内的相对路径");
    }
    const path = await realpath(resolve(skill.directory, resource));
    if (!isPathWithin(skill.directory, path))
      throw new Error("SKILL_RESOURCE_INVALID: 拒绝读取 Skill 目录外的资源");
    const buffer = await readRegularFile(path, MAX_RESOURCE_BYTES, signal);
    const mimeType = detectImageMimeType(buffer);
    const content =
      mimeType !== null || buffer.includes(0) || !isUtf8(buffer)
        ? `Binary resource: ${path} (${buffer.byteLength} bytes). Use this absolute path with run_command to process or copy the file under the current approval policy.`
        : buffer.toString("utf8");
    return {
      ...details,
      content,
      resource,
      resourcePath: path,
      size: buffer.byteLength,
      ...(mimeType === null
        ? {}
        : { image: { data: buffer.toString("base64"), mimeType, type: "image" as const } }),
    };
  }

  public async remove(name: string, scope: WritableSkillScope): Promise<void> {
    const skill = await this.getRecord(name, scope, false);
    if (skill.directory === null || skill.collectionId !== null)
      throw new Error("SKILL_READ_ONLY: 系统或插件 Skill 不可单独卸载");
    await rm(skill.directory, { recursive: true });
  }

  // 创建新的 Skill 目录和 SKILL.md
  public async create(input: CreateSkillInput, signal?: AbortSignal): Promise<CreatedSkill> {
    signal?.throwIfAborted();
    const frontmatter = { description: input.description.trim(), name: input.name.trim() };
    const instructions = input.instructions.trim();
    const content = `---\n${stringify(frontmatter)}---\n\n${instructions}\n`;
    readSkillDocument(content, frontmatter.name);

    const root = await this.resolveRoot(input.scope, true);
    if (root === null) throw new Error("SKILL_ROOT_UNAVAILABLE: Skill 根目录不可用");
    const directory = resolve(root, frontmatter.name);
    if (!isPathWithin(root, directory)) throw new Error("SKILL_INVALID: Skill 路径越界");

    let created = false;
    try {
      await mkdir(directory, { mode: 0o700 });
      created = true;
      signal?.throwIfAborted();
      await writeFile(join(directory, "SKILL.md"), content, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
        ...(signal === undefined ? {} : { signal }),
      });
      return {
        document: content,
        skill: toSummary(await this.getRecord(frontmatter.name, input.scope, false)),
      };
    } catch (error: unknown) {
      if (created) await rm(directory, { force: true, recursive: true });
      if (isNodeError(error) && error.code === "EEXIST") {
        throw new Error(`SKILL_ALREADY_EXISTS: ${frontmatter.name} 已存在`);
      }
      throw error;
    }
  }

  private async discoverRecords(
    scope?: SkillScope,
    signal?: AbortSignal,
  ): Promise<readonly SkillRecord[]> {
    const scopes = scope ? [scope] : [SkillScope.SYSTEM, SkillScope.PROJECT, SkillScope.GLOBAL];
    const records: SkillRecord[] = [];
    const registeredNames = new Set<string>();

    for (const currentScope of scopes) {
      signal?.throwIfAborted();
      if (currentScope === SkillScope.SYSTEM) {
        for (const skill of SYSTEM_SKILLS) {
          if (registeredNames.has(skill.name)) continue;
          records.push(await this.definitionRecord(skill, false, signal));
          registeredNames.add(skill.name);
        }
        continue;
      }
      if (currentScope === SkillScope.GLOBAL) {
        for (const skill of this.context.getRegisteredGlobalSkills?.() ?? []) {
          if (registeredNames.has(skill.name)) continue;
          records.push(await this.definitionRecord(skill, false, signal));
          registeredNames.add(skill.name);
        }
      }
      for (const root of await this.resolveRoots(currentScope)) {
        for (const entry of await readdir(root, { withFileTypes: true })) {
          signal?.throwIfAborted();
          if (!entry.isDirectory() || registeredNames.has(entry.name)) continue;
          try {
            const record = await this.readRecord(root, entry.name, currentScope, false, signal);
            if (this.context.isSkillEnabled?.(record.directory) === false) {
              registeredNames.add(record.name);
              continue;
            }
            records.push(record);
            registeredNames.add(record.name);
          } catch {
            signal?.throwIfAborted();
            // 无效 Skill 不进入运行时 Registry；显式读取时会返回结构错误。
          }
        }
      }
    }
    return records.sort((left, right) => left.id.localeCompare(right.id));
  }

  private async getRecord(
    name: string,
    scope?: SkillScope,
    shouldListResources = true,
    signal?: AbortSignal,
  ): Promise<SkillRecord> {
    if (!new RegExp(SKILL_NAME_PATTERN).test(name) || name.length > 64) {
      throw new Error("SKILL_INVALID: Skill 名称无效");
    }
    const scopes = scope ? [scope] : [SkillScope.SYSTEM, SkillScope.PROJECT, SkillScope.GLOBAL];
    let invalidError: unknown;
    for (const currentScope of scopes) {
      signal?.throwIfAborted();
      if (currentScope === SkillScope.SYSTEM) {
        const systemSkill = findSystemSkill(name);
        if (systemSkill) {
          return this.definitionRecord(systemSkill, shouldListResources, signal);
        }
        continue;
      }
      if (currentScope === SkillScope.GLOBAL) {
        const registeredSkill = this.context
          .getRegisteredGlobalSkills?.()
          .find((skill) => skill.name === name);
        if (registeredSkill) {
          return this.definitionRecord(registeredSkill, shouldListResources, signal);
        }
      }
      for (const root of await this.resolveRoots(currentScope)) {
        try {
          const record = await this.readRecord(
            root,
            name,
            currentScope,
            shouldListResources,
            signal,
          );
          if (this.context.isSkillEnabled?.(record.directory) === false) {
            throw new Error(`SKILL_DISABLED: ${name}`);
          }
          return record;
        } catch (error: unknown) {
          if (isNodeError(error) && error.code === "ENOENT") continue;
          if (error instanceof Error && error.message.startsWith("SKILL_DISABLED:")) throw error;
          invalidError = error;
        }
      }
    }
    if (invalidError !== undefined) throw invalidError;
    throw new Error(`SKILL_NOT_FOUND: ${name}`);
  }

  private async readRecord(
    root: string,
    name: string,
    scope: WritableSkillScope,
    shouldListResources = true,
    signal?: AbortSignal,
  ): Promise<FileSkillRecord> {
    const directory = await realpath(resolve(root, name));
    if (!isPathWithin(root, directory)) throw new Error("SKILL_INVALID: Skill 目录越界");
    const documentPath = await realpath(join(directory, "SKILL.md"));
    if (!isPathWithin(directory, documentPath)) throw new Error("SKILL_INVALID: SKILL.md 路径越界");
    const content = (await readRegularFile(documentPath, MAX_SKILL_BYTES, signal)).toString("utf8");
    const { frontmatter, instructions } = readSkillDocument(content, name);
    const resources: string[] = [];
    let resourcesTruncated = false;
    if (shouldListResources) {
      let entriesVisited = 0;
      for await (const entry of glob("**/*", { cwd: directory, withFileTypes: true })) {
        signal?.throwIfAborted();
        entriesVisited += 1;
        if (entriesVisited > 2000) {
          resourcesTruncated = true;
          break;
        }
        if (!entry.isFile() || entry.name === "SKILL.md") continue;
        if (resources.length === MAX_RESOURCES) {
          resourcesTruncated = true;
          break;
        }
        const resourcePath = resolve(entry.parentPath, entry.name);
        const resourceFromSkill = relative(directory, resourcePath);
        if (!resourceFromSkill.startsWith(`..${sep}`) && resourceFromSkill !== "..") {
          resources.push(resourceFromSkill);
        }
      }
    }
    resources.sort((left, right) => left.localeCompare(right));
    return {
      collectionId: null,
      frontmatter,
      description: frontmatter.description,
      directory,
      id: skillId(scope, name),
      instructions,
      name,
      resources,
      resourcesTruncated,
      scope,
      type: frontmatter.type ?? SkillType.NONE,
    };
  }

  private async definitionRecord(
    skill: SkillDefinition,
    shouldListResources: boolean,
    signal?: AbortSignal,
  ): Promise<SkillRecord> {
    const definition = toDefinitionRecord(skill, this.context.skillGatewayUrl);
    if (!skill.directory) return definition;
    const record = await this.readRecord(
      resolve(skill.directory, ".."),
      skill.name,
      SkillScope.GLOBAL,
      shouldListResources,
      signal,
    );
    return {
      ...record,
      collectionId: definition.collectionId,
      id: definition.id,
      type: definition.type,
      instructions: record.instructions.replaceAll(
        "{skillGatewayUrl}",
        this.context.skillGatewayUrl ?? "",
      ),
    };
  }

  private async resolveRoots(scope: WritableSkillScope): Promise<string[]> {
    const home = this.context.homeRoot ?? homedir();
    const paths =
      scope === SkillScope.PROJECT
        ? [
            join(this.context.workspaceRoot, ".agents/skills"),
            join(this.context.workspaceRoot, ".claude/skills"),
          ]
        : [
            join(this.context.globalRoot, "skills"),
            join(home, ".agents/skills"),
            join(home, ".claude/skills"),
          ];
    const roots: string[] = [];
    for (const path of paths) {
      try {
        const root =
          scope === SkillScope.PROJECT
            ? await resolveWorkspacePath({
                path,
                allowMissing: true,
                workspaceRoot: this.context.workspaceRoot,
              })
            : await realpath(path);
        if ((await stat(root)).isDirectory() && !roots.includes(root)) roots.push(root);
      } catch (error: unknown) {
        if (isNodeError(error) && error.code === "ENOENT") continue;
        throw error;
      }
    }
    return roots;
  }

  private async resolveRoot(
    scope: WritableSkillScope,
    shouldCreate: boolean,
  ): Promise<string | null> {
    const configuredRoot =
      scope === SkillScope.PROJECT
        ? join(this.context.workspaceRoot, ".agents", "skills")
        : join(this.context.globalRoot, "skills");
    try {
      if (shouldCreate) await mkdir(configuredRoot, { mode: 0o700, recursive: true });
      if (scope === SkillScope.PROJECT) {
        const root = await resolveWorkspacePath({
          allowMissing: !shouldCreate,
          path: ".agents/skills",
          workspaceRoot: this.context.workspaceRoot,
        });
        if (!(await stat(root)).isDirectory()) throw new Error("Skill 根路径不是目录");
        return root;
      }
      const root = await realpath(configuredRoot);
      if (!(await stat(root)).isDirectory()) throw new Error("Skill 根路径不是目录");
      return root;
    } catch (error: unknown) {
      if (!shouldCreate && isNodeError(error) && error.code === "ENOENT") return null;
      throw error;
    }
  }
}
