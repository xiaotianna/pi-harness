import type { AgentTool } from "@earendil-works/pi-agent-core";
import { ToolPermission, type ToolPolicy } from "@pi-harness/policy";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { formatLoadedSkill } from "../prompts/skill-content.js";
import { type SkillRegistry, SkillScope } from "../skill-registry.js";

type LoadSkillDetails = Omit<Awaited<ReturnType<SkillRegistry["load"]>>, "content" | "image">;

const LoadSkillParameters = Type.Object({
  approveTools: Type.Optional(
    Type.Boolean({
      description:
        "请求用户批准 Skill 声明的 allowed-tools，授权仅对当前 Run 生效；普通读取无需设置",
    }),
  ),
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
  supportsImageInput: () => boolean = () => false,
): AgentTool<typeof LoadSkillParameters, LoadSkillDetails> {
  return {
    description:
      "加载 Skill 指令、元数据和根目录，按需读取引用文本、脚本、图片及二进制资源信息；approveTools 可申请当前 Run 的声明工具预授权。",
    executionMode: "sequential",
    label: "Load skill",
    name: "load_skill",
    parameters: LoadSkillParameters,
    async execute(_toolCallId, input, signal) {
      const loaded = await registry.load(input.name, input.scope, input.resource, signal);
      if (input.approveTools && loaded.resource === "SKILL.md") registry.grant(loaded);
      const { content: _content, image, ...details } = loaded;
      return {
        content: [
          { type: "text", text: formatLoadedSkill(loaded) } as const,
          ...(image && supportsImageInput() ? [image] : []),
        ],
        details,
      };
    },
  };
}

export function createLoadSkillPolicy(registry: SkillRegistry): ToolPolicy {
  return {
    permission: ToolPermission.SKILL_ACTIVATION,
    async resolveGrant(args) {
      if (!Value.Check(LoadSkillParameters, args))
        throw new Error("SKILL_INVALID: 无效 Skill 参数");
      if (!args.approveTools) return null;
      if (args.resource !== undefined && args.resource !== "SKILL.md")
        throw new Error("SKILL_INVALID: 只能对 SKILL.md 申请工具授权");
      const skill = await registry.load(args.name, args.scope);
      const declarations = skill.frontmatter["allowed-tools"];
      if (!declarations?.length) return null;
      return {
        fingerprint: registry.prepareGrant(skill),
        target: skill.id,
        summary: `为当前 Run 授权 Skill ${skill.name} 的工具：${typeof declarations === "string" ? declarations : declarations.join(" ")}`,
        risk: "批准后，此 Skill 声明的匹配工具在本 Run 内无需逐次审批，可能执行命令或修改工作区文件；路径保护和计划模式仍然生效。",
      };
    },
  };
}
