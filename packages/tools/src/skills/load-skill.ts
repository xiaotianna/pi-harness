import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
import { type SkillRegistry, SkillScope } from "../skill-registry.js";

type LoadSkillDetails = Omit<Awaited<ReturnType<SkillRegistry["load"]>>, "content">;

const LoadSkillParameters = Type.Object({
  name: Type.String({ description: "Skill 名称", minLength: 1 }),
  resource: Type.Optional(
    Type.String({ description: "要加载的 Skill 相对资源路径；默认加载 SKILL.md", minLength: 1 }),
  ),
  scope: Type.Optional(
    Type.Union([
      Type.Literal(SkillScope.SYSTEM),
      Type.Literal(SkillScope.PROJECT),
      Type.Literal(SkillScope.GLOBAL),
    ]),
  ),
});

export function createLoadSkillTool(
  registry: SkillRegistry,
): AgentTool<typeof LoadSkillParameters, LoadSkillDetails> {
  return {
    description:
      "加载已发现 Skill 的指令正文或其 references、scripts 等文本资源；系统 Skill 名称保留，其他同名 Skill 由项目定义优先于全局定义。",
    executionMode: "parallel",
    label: "Load skill",
    name: "load_skill",
    parameters: LoadSkillParameters,
    async execute(_toolCallId, input) {
      const { content, ...details } = await registry.load(input.name, input.scope, input.resource);
      return { content: [{ type: "text", text: content }], details };
    },
  };
}
