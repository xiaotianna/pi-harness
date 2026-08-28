import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { type SkillRegistry, SkillScope, type SkillSummary } from "../skill-registry.js";

const FindSkillParameters = Type.Object({
  query: Type.String({ description: "按名称和 description 搜索", minLength: 1 }),
  scope: Type.Optional(
    Type.Union([Type.Literal(SkillScope.PROJECT), Type.Literal(SkillScope.GLOBAL)]),
  ),
});

export function createFindSkillTool(
  registry: SkillRegistry,
): AgentTool<typeof FindSkillParameters, readonly SkillSummary[]> {
  return {
    description: "搜索全局与项目 Skill，只返回用于选择的名称和 description。",
    executionMode: "parallel",
    label: "Find skill",
    name: "find_skill",
    parameters: FindSkillParameters,
    async execute(_toolCallId, input) {
      const skills = await registry.find(input.query, input.scope);
      return { content: [{ type: "text", text: JSON.stringify(skills) }], details: skills };
    },
  };
}
