import { isPlainObject } from "es-toolkit";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { parse } from "yaml";
import { SkillType } from "../skills/types.js";

export const SKILL_NAME_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export const SkillFrontmatterSchema = Type.Object(
  {
    "allowed-tools": Type.Optional(
      Type.Union([Type.String(), Type.Array(Type.String({ minLength: 1 }))]),
    ),
    compatibility: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
    description: Type.String({ maxLength: 1024, minLength: 1 }),
    license: Type.Optional(Type.String({ minLength: 1 })),
    metadata: Type.Optional(Type.Record(Type.String(), Type.String())),
    name: Type.String({ maxLength: 64, minLength: 1, pattern: SKILL_NAME_PATTERN }),
    type: Type.Optional(Type.Union([Type.Literal(SkillType.NONE), Type.Literal(SkillType.OAUTH)])),
  },
  { additionalProperties: false },
);

export type SkillFrontmatter = Static<typeof SkillFrontmatterSchema>;

export function readSkillDocument(
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

  const instructions = content.slice(match[0].length).trim();
  if (!instructions) throw new Error("SKILL_INVALID: Skill instructions 不能为空");
  return { frontmatter, instructions };
}
