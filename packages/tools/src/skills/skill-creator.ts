import type { AgentTool } from "@earendil-works/pi-agent-core";
import { ToolPermission, type ToolPolicy } from "@pi-harness/policy";
import { createPatch } from "diff";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { type SkillRegistry, SkillScope, type SkillSummary } from "../skill-registry.js";
import type { FileChangeDetails } from "../utils/file.js";

const SkillCreatorParameters = Type.Object({
  description: Type.String({
    description: "Skill 的用途与触发条件",
    maxLength: 1024,
    minLength: 1,
  }),
  instructions: Type.String({
    description: "SKILL.md Markdown 指令正文",
    maxLength: 128 * 1024,
    minLength: 1,
  }),
  name: Type.String({
    description: "Skill 名称，使用小写字母、数字和连字符",
    maxLength: 64,
    minLength: 1,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  }),
  scope: Type.Union([Type.Literal(SkillScope.PROJECT), Type.Literal(SkillScope.GLOBAL)]),
});

export const skillCreatorToolPolicy = {
  allowMissing: true,
  permission: ToolPermission.WORKSPACE_WRITE,
  resolveTarget(argumentsValue) {
    if (!Value.Check(SkillCreatorParameters, argumentsValue)) return null;
    const { name, scope } = argumentsValue;
    return scope === SkillScope.PROJECT
      ? { path: `.agents/skills/${name}` }
      : {
          fingerprint: `global:${name}`,
          target: `.pi-harness/skills/${name}/SKILL.md`,
        };
  },
  risk: "该操作会创建可影响后续 Agent 行为的 Skill。",
  summary: "创建 Skill",
} satisfies ToolPolicy;

interface SkillCreatorDetails {
  fileChanges?: readonly FileChangeDetails[];
  skill: SkillSummary;
}

export function createSkillCreatorTool(
  registry: SkillRegistry,
): AgentTool<typeof SkillCreatorParameters, SkillCreatorDetails> {
  return {
    description:
      "创建符合结构规范的最小 Skill（目录与 SKILL.md）；只创建新 Skill，不覆盖已有内容。",
    executionMode: "sequential",
    label: "Create skill",
    name: "skill_creator",
    parameters: SkillCreatorParameters,
    async execute(_toolCallId, input, signal) {
      const created = await registry.create(input, signal);
      const skill = created.skill;
      const path = `.agents/skills/${input.name}/SKILL.md`;
      const details: SkillCreatorDetails = {
        ...(input.scope === SkillScope.PROJECT
          ? {
              fileChanges: [
                {
                  after: created.document,
                  before: null,
                  diff: createPatch(path, "", created.document, "before", "after"),
                  path,
                },
              ],
            }
          : {}),
        skill,
      };
      return {
        content: [{ type: "text", text: `已创建 ${skill.id}` }],
        details,
      };
    },
  };
}
