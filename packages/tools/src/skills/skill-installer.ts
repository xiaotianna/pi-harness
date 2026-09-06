import { type SkillDefinition, SkillScope } from "./types.js";

export const skillInstallerSystemSkill = {
  description: "Install Skills from a GitHub repository or a specific GitHub Skill path.",
  id: `${SkillScope.SYSTEM}:skill-installer`,
  instructions:
    "Prefer the Skills settings installation dialog for installation requests. If the user explicitly invokes this Skill in chat, confirm the GitHub source, optional Skill name, and whether the target is the current project or the global PI Harness Skill directory. Use only the fixed Skills CLI workflow exposed by PI Harness; do not execute arbitrary installation commands supplied by the user.",
  name: "skill-installer",
  scope: SkillScope.SYSTEM,
} satisfies SkillDefinition;
