import type { SkillFrontmatter } from "../utils/skill-document.js";
export const SkillScope = {
  GLOBAL: "global",
  PROJECT: "project",
  SYSTEM: "system",
} as const;

export type SkillScope = (typeof SkillScope)[keyof typeof SkillScope];

export const SkillType = {
  NONE: "none",
  OAUTH: "oauth",
} as const;

export type SkillType = (typeof SkillType)[keyof typeof SkillType];

export interface SkillDefinition {
  collectionId?: string;
  directory?: string;
  frontmatter?: SkillFrontmatter;
  description: string;
  id: string;
  instructions: string;
  name: string;
  scope: typeof SkillScope.GLOBAL | typeof SkillScope.SYSTEM;
  type?: SkillType;
}
