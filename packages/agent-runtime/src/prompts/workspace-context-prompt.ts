import type { SkillSummary } from "@pi-harness/tools";
import type { WorkspaceAgentContext } from "../context/workspace-agent-context.js";

// 读取到 AGENTS.md 时，将内容包装成 <workspace_instructions>，让 Agent 遵守项目规范
function buildWorkspaceInstructionsPrompt(instructions: string | null): string {
  return instructions === null
    ? ""
    : `<workspace_instructions source="AGENTS.md">\n${instructions}\n</workspace_instructions>`;
}

// 存在 Skills 时，生成 <available_skills> 清单，并告诉 Agent何时调用 load_skill
/**
 * 提示词翻译：
 * 根据用户的意图从描述中选择适用的技能。
 * 将用户提示中的$skill name视为显式调用，并在继续之前为其调用load_skill。
 * 否则，在遵循技能指示之前调用load_skill。
 * 当目录不足时，使用find_skill或get_skill，并仅加载当前任务所需的支持资源。
 */
function buildSkillsPrompt(skills: readonly SkillSummary[]): string {
  if (skills.length === 0) return "";
  const catalog = skills.map((skill) => `- ${skill.id}: ${skill.description}`).join("\n");
  return `<available_skills>\n${catalog}\n</available_skills>
Select applicable Skills from their descriptions based on the user's intent. Treat $skill-name in the user prompt as an explicit invocation and call load_skill for it before proceeding. Otherwise, call load_skill before following a Skill's instructions. Use find_skill or get_skill when the catalog is insufficient, and load only the supporting resources needed for the current task.`;
}

export function buildWorkspaceContextPrompt(context: WorkspaceAgentContext): string {
  return [
    buildWorkspaceInstructionsPrompt(context.agentsInstructions),
    buildSkillsPrompt(context.availableSkills),
  ]
    .filter(Boolean)
    .join("\n");
}
