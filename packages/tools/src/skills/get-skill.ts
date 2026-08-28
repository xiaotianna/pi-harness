import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { type SkillRegistry, SkillScope } from "../skill-registry.js";

const GetSkillParameters = Type.Object({
  name: Type.String({ description: "Skill 名称", minLength: 1 }),
  scope: Type.Optional(
    Type.Union([Type.Literal(SkillScope.PROJECT), Type.Literal(SkillScope.GLOBAL)]),
  ),
});

export function createGetSkillTool(
  registry: SkillRegistry,
): AgentTool<typeof GetSkillParameters, Awaited<ReturnType<SkillRegistry["get"]>>> {
  return {
    description: "按名称读取全局或项目 Skill 的元数据与资源清单，不加载指令正文。",
    executionMode: "parallel",
    label: "Get skill",
    name: "get_skill",
    parameters: GetSkillParameters,
    async execute(_toolCallId, input) {
      const skill = await registry.get(input.name, input.scope);
      return { content: [{ type: "text", text: JSON.stringify(skill) }], details: skill };
    },
  };
}
