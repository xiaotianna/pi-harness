import { glob, mkdir, readdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { isPathWithin, resolveWorkspacePath } from "@pi-harness/policy";
import { isPlainObject } from "es-toolkit";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { parse, stringify } from "yaml";
import { findSystemSkill, SYSTEM_SKILL_SCOPE, SYSTEM_SKILLS } from "./skills/system-skills.js";

const MAX_SKILL_BYTES = 128 * 1024;
const MAX_RESOURCE_BYTES = 1024 * 1024;
const MAX_RESOURCES = 200;
const SKILL_NAME_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export const SkillScope = {
  GLOBAL: "global",
  PROJECT: "project",
  SYSTEM: SYSTEM_SKILL_SCOPE,
} as const;

export type SkillScope = (typeof SkillScope)[keyof typeof SkillScope];
export type WritableSkillScope = typeof SkillScope.GLOBAL | typeof SkillScope.PROJECT;

const SkillFrontmatterSchema = Type.Object(
  {
    "allowed-tools": Type.Optional(
      Type.Union([Type.String(), Type.Array(Type.String({ minLength: 1 }))]),
    ),
    description: Type.String({ maxLength: 1024, minLength: 1 }),
    license: Type.Optional(Type.String({ minLength: 1 })),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    name: Type.String({ maxLength: 64, minLength: 1, pattern: SKILL_NAME_PATTERN }),
  },
  { additionalProperties: false },
);

type SkillFrontmatter = Static<typeof SkillFrontmatterSchema>;

export interface SkillSummary {
  description: string;
  id: string;
  name: string;
  scope: SkillScope;
}

export interface SkillListItem extends SkillSummary {
  directory: string | null;
}

export interface SkillDetails extends SkillListItem {
  resources: readonly string[];
  resourcesTruncated: boolean;
}

export interface LoadedSkill extends SkillSummary {
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
  globalRoot: string;
  isSkillEnabled?: (directory: string) => boolean;
  workspaceRoot: string;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function readSkillDocument(
  content: string,
  directoryName: string,
): {
  frontmatter: SkillFrontmatter;
  instructions: string;
} {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) throw new Error("SKILL_INVALID: SKILL.md 缺少有效 YAML frontmatter");

  let frontmatter: unknown;
  try {
    frontmatter = parse(match[1] ?? "", { maxAliasCount: 0, uniqueKeys: true });
  } catch {
    throw new Error("SKILL_INVALID: SKILL.md frontmatter 不是有效 YAML");
  }
  if (!isPlainObject(frontmatter) || !Value.Check(SkillFrontmatterSchema, frontmatter)) {
    throw new Error("SKILL_INVALID: SKILL.md frontmatter 不符合 Skill 结构规范");
  }
  if (frontmatter.name !== directoryName) {
    throw new Error("SKILL_INVALID: Skill 目录名必须与 frontmatter.name 一致");
  }
  if (frontmatter.description.includes("<") || frontmatter.description.includes(">")) {
    throw new Error("SKILL_INVALID: Skill description 不能包含尖括号");
  }

  const instructions = content.slice(match[0].length).trim();
  if (!instructions) throw new Error("SKILL_INVALID: Skill instructions 不能为空");
  return { frontmatter, instructions };
}

async function readBoundedText(path: string, maxBytes: number): Promise<string> {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size > maxBytes) {
    throw new Error(`SKILL_INVALID: 文件不是普通文件或超过 ${maxBytes} 字节限制`);
  }
  return readFile(path, "utf8");
}

function skillId(scope: SkillScope, name: string): string {
  return `${scope}:${name}`;
}

function toSummary({
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
  instructions: _instructions,
  resources: _resources,
  resourcesTruncated: _resourcesTruncated,
  ...skill
}: SkillRecord): SkillListItem {
  return skill;
}

// SkillRegistry 负责发现、校验、查询、读取和创建 Skill
export class SkillRegistry {
  public constructor(private readonly context: SkillRegistryContext) {}

  // 扫描全部有效 Skill，返回简要信息
  public async discover(): Promise<readonly SkillSummary[]> {
    return (await this.discoverRecords()).map(toSummary);
  }

  public async discoverListItems(): Promise<readonly SkillListItem[]> {
    return (await this.discoverRecords()).map(toListItem);
  }

  // 根据名称和描述搜索 Skill
  public async find(query: string, scope?: SkillScope): Promise<readonly SkillSummary[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    return (await this.discoverRecords(scope))
      .filter((skill) =>
        `${skill.name} ${skill.description}`.toLocaleLowerCase().includes(normalizedQuery),
      )
      .slice(0, 20)
      .map(toSummary);
  }

  // 获取 Skill 元数据和资源文件列表
  public async get(name: string, scope?: SkillScope): Promise<SkillDetails> {
    return toDetails(await this.getRecord(name, scope));
  }

  // 加载 SKILL.md 指令或指定资源内容
  public async load(name: string, scope?: SkillScope, resource?: string): Promise<LoadedSkill> {
    const skill = await this.getRecord(name, scope, false);
    const summary = toSummary(skill);
    if (resource === undefined || resource === "SKILL.md") {
      return { ...summary, content: skill.instructions, resource: "SKILL.md" };
    }
    if (skill.directory === null) {
      throw new Error("SKILL_RESOURCE_INVALID: 系统 Skill 不包含可读取资源");
    }
    if (isAbsolute(resource) || resource.split(/[\\/]/).includes("..")) {
      throw new Error("SKILL_RESOURCE_INVALID: resource 必须是 Skill 目录内的相对路径");
    }
    const path = await realpath(resolve(skill.directory, resource));
    if (!isPathWithin(skill.directory, path)) {
      throw new Error("SKILL_RESOURCE_INVALID: 拒绝读取 Skill 目录外的资源");
    }
    const content = await readBoundedText(path, MAX_RESOURCE_BYTES);
    return { ...summary, content, resource };
  }

  public async remove(name: string, scope: WritableSkillScope): Promise<void> {
    const skill = await this.getRecord(name, scope, false);
    if (skill.directory === null) throw new Error("SKILL_READ_ONLY: 系统 Skill 不可卸载");
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

  private async discoverRecords(scope?: SkillScope): Promise<readonly SkillRecord[]> {
    const scopes = scope ? [scope] : [SkillScope.SYSTEM, SkillScope.PROJECT, SkillScope.GLOBAL];
    const records: SkillRecord[] = [];
    const registeredNames = new Set<string>();

    for (const currentScope of scopes) {
      if (currentScope === SkillScope.SYSTEM) {
        for (const skill of SYSTEM_SKILLS) {
          if (registeredNames.has(skill.name)) continue;
          records.push({
            ...skill,
            directory: null,
            resources: [],
            resourcesTruncated: false,
          });
          registeredNames.add(skill.name);
        }
        continue;
      }
      const root = await this.resolveRoot(currentScope, false);
      if (root === null) continue;
      for (const entry of await readdir(root, { withFileTypes: true })) {
        if (!entry.isDirectory() || registeredNames.has(entry.name)) continue;
        try {
          const record = await this.readRecord(root, entry.name, currentScope, false);
          if (this.context.isSkillEnabled?.(record.directory) === false) continue;
          records.push(record);
          registeredNames.add(record.name);
        } catch {
          // 无效 Skill 不进入运行时 Registry；显式读取时会返回结构错误。
        }
      }
    }
    return records.sort((left, right) => left.id.localeCompare(right.id));
  }

  private async getRecord(
    name: string,
    scope?: SkillScope,
    shouldListResources = true,
  ): Promise<SkillRecord> {
    if (!new RegExp(SKILL_NAME_PATTERN).test(name) || name.length > 64) {
      throw new Error("SKILL_INVALID: Skill 名称无效");
    }
    const scopes = scope ? [scope] : [SkillScope.SYSTEM, SkillScope.PROJECT, SkillScope.GLOBAL];
    let invalidError: unknown;
    for (const currentScope of scopes) {
      if (currentScope === SkillScope.SYSTEM) {
        const systemSkill = findSystemSkill(name);
        if (systemSkill) {
          return {
            ...systemSkill,
            directory: null,
            resources: [],
            resourcesTruncated: false,
          };
        }
        continue;
      }
      const root = await this.resolveRoot(currentScope, false);
      if (root === null) continue;
      try {
        const record = await this.readRecord(root, name, currentScope, shouldListResources);
        if (this.context.isSkillEnabled?.(record.directory) === false) {
          throw new Error(`SKILL_DISABLED: ${name}`);
        }
        return record;
      } catch (error: unknown) {
        if (isNodeError(error) && error.code === "ENOENT") continue;
        invalidError = error;
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
  ): Promise<FileSkillRecord> {
    const directory = await realpath(resolve(root, name));
    if (!isPathWithin(root, directory)) throw new Error("SKILL_INVALID: Skill 目录越界");
    const content = await readBoundedText(join(directory, "SKILL.md"), MAX_SKILL_BYTES);
    const { frontmatter, instructions } = readSkillDocument(content, name);
    const resources: string[] = [];
    let resourcesTruncated = false;
    if (shouldListResources) {
      for await (const entry of glob("**/*", { cwd: directory, withFileTypes: true })) {
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
      description: frontmatter.description,
      directory,
      id: skillId(scope, name),
      instructions,
      name,
      resources,
      resourcesTruncated,
      scope,
    };
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
