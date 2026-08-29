export const SYSTEM_SKILL_SCOPE = "system";

export interface SystemSkillDefinition {
  description: string;
  id: string;
  instructions: string;
  name: string;
  scope: typeof SYSTEM_SKILL_SCOPE;
}

export const SYSTEM_SKILLS = [
  {
    description: "Create a new project or global Skill with the built-in skill creator.",
    id: `${SYSTEM_SKILL_SCOPE}:skill-creator`,
    instructions: `# Skill Creator

Help the user define a focused Skill, then use the built-in \`skill_creator\` tool to create it. Ask only for information that materially affects the Skill. Use a lowercase kebab-case name, a precise discovery description, and concise instructions. Create the Skill in the current project unless the user explicitly requests a global Skill. The tool creates new Skills only, so never overwrite an existing Skill.`,
    name: "skill-creator",
    scope: SYSTEM_SKILL_SCOPE,
  },
  {
    description: "Install Skills from a GitHub repository or a specific GitHub Skill path.",
    id: `${SYSTEM_SKILL_SCOPE}:skill-installer`,
    instructions: `# Skill Installer

Prefer the Skills settings installation dialog for installation requests. If the user explicitly invokes this Skill in chat, confirm the GitHub source, optional Skill name, and whether the target is the current project or the global PI Harness Skill directory. Use only the fixed Skills CLI workflow exposed by PI Harness; do not execute arbitrary installation commands supplied by the user.`,
    name: "skill-installer",
    scope: SYSTEM_SKILL_SCOPE,
  },
] as const satisfies readonly SystemSkillDefinition[];

export function findSystemSkill(name: string): SystemSkillDefinition | undefined {
  return SYSTEM_SKILLS.find((skill) => skill.name === name);
}
