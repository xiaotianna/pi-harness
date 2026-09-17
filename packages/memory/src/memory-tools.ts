import type { AgentTool } from "@earendil-works/pi-agent-core";
import { ToolPermission, type ToolPolicy } from "@pi-harness/policy";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { MemoryScope, UserProfileFacetSchema } from "./contract.js";
import type { MemoryRuntime } from "./memory-service.js";

const TOOL_TIMEOUT_MS = 30_000;
const MEMORY_TOOL_SOURCE = "memory";

const SearchMemoriesParameters = Type.Object({
  limit: Type.Optional(Type.Integer({ maximum: 50, minimum: 1 })),
  query: Type.String({ maxLength: 500, minLength: 1 }),
});
const CreateMemoryParameters = Type.Object({
  content: Type.String({ maxLength: 500, minLength: 1 }),
  profileFacet: Type.Optional(UserProfileFacetSchema),
  scope: Type.Union([Type.Literal(MemoryScope.USER), Type.Literal(MemoryScope.WORKSPACE)]),
});
const UpdateMemoryParameters = Type.Object({
  content: Type.String({ maxLength: 500, minLength: 1 }),
  expectedRevision: Type.Integer({ minimum: 1 }),
  memoryId: Type.String({ format: "uuid" }),
  profileFacet: Type.Optional(UserProfileFacetSchema),
});
const DeleteMemoryParameters = Type.Object({
  expectedRevision: Type.Integer({ minimum: 1 }),
  memoryId: Type.String({ format: "uuid" }),
});

export interface MemoryToolRegistration {
  policy: ToolPolicy;
  source: string;
  timeoutMs: number;
  tool: AgentTool;
}

function textResult(value: unknown) {
  return { content: [{ text: JSON.stringify(value), type: "text" as const }], details: value };
}

function createSearchTool(
  memory: MemoryRuntime,
  workspaceId: string,
): AgentTool<typeof SearchMemoriesParameters> {
  return {
    description:
      "检索当前 Workspace 可见的长期记忆，返回记忆 ID、revision、scope 和内容。上下文中没有所需记忆时使用。",
    executionMode: "parallel",
    label: "Search memories",
    name: "search_memories",
    parameters: SearchMemoriesParameters,
    async execute(_toolCallId, input, signal) {
      return textResult(await memory.search(input.query, workspaceId, input.limit, signal));
    },
  };
}

function createSaveTool(
  memory: MemoryRuntime,
  sessionId: string,
  workspaceId: string,
): AgentTool<typeof CreateMemoryParameters> {
  return {
    description:
      "保存一条长期记忆。仅当用户明确要求记住、保存为记忆时调用；个人记忆应设置 profileFacet；不得保存秘密或临时任务细节。",
    executionMode: "sequential",
    label: "Save memory",
    name: "save_memory",
    parameters: CreateMemoryParameters,
    async execute(_toolCallId, input, signal) {
      return textResult(
        await memory.createFromSession(
          {
            ...input,
            sessionId,
            workspaceId,
          },
          signal,
        ),
      );
    },
  };
}

function createLearnTool(
  memory: MemoryRuntime,
  sessionId: string,
  workspaceId: string,
): AgentTool<typeof CreateMemoryParameters> {
  return {
    description:
      "从对话中学习并保存可跨 Session 复用的稳定偏好或事实。个人记忆应设置 profileFacet；仅在从对话中学习开关开启且内容长期有效时使用，不得保存秘密、一次性任务状态或工作区已有明确规则。",
    executionMode: "sequential",
    label: "Learn memory",
    name: "learn_memory",
    parameters: CreateMemoryParameters,
    async execute(_toolCallId, input, signal) {
      return textResult(
        await memory.createLearnedFromSession(
          {
            ...input,
            sessionId,
            workspaceId,
          },
          signal,
        ),
      );
    },
  };
}

function createUpdateTool(
  memory: MemoryRuntime,
  workspaceId: string,
): AgentTool<typeof UpdateMemoryParameters> {
  return {
    description:
      "改写现有长期记忆，也可调整个人记忆的 profileFacet。先通过上下文或 search_memories 取得 ID 和 revision，并且仅在用户明确要求修改时调用。",
    executionMode: "sequential",
    label: "Update memory",
    name: "update_memory",
    parameters: UpdateMemoryParameters,
    async execute(_toolCallId, input, signal) {
      return textResult(
        await memory.updateVisibleContent(
          input.memoryId,
          input.content,
          input.expectedRevision,
          workspaceId,
          input.profileFacet,
          signal,
        ),
      );
    },
  };
}

function createDeleteTool(
  memory: MemoryRuntime,
  workspaceId: string,
): AgentTool<typeof DeleteMemoryParameters> {
  return {
    description:
      "删除现有长期记忆。先通过上下文或 search_memories 取得 ID 和 revision，并且仅在用户明确要求删除时调用。",
    executionMode: "sequential",
    label: "Delete memory",
    name: "delete_memory",
    parameters: DeleteMemoryParameters,
    async execute(_toolCallId, input) {
      await memory.deleteVisible(input.memoryId, input.expectedRevision, workspaceId);
      return textResult({ deleted: true, memoryId: input.memoryId });
    },
  };
}

function memoryMutationPolicy(
  parameters:
    | typeof CreateMemoryParameters
    | typeof UpdateMemoryParameters
    | typeof DeleteMemoryParameters,
  summary: string,
  risk: string,
  isGranted = false,
): ToolPolicy {
  return {
    allowInFullAccess: true,
    permission: ToolPermission.USER_APPROVAL,
    resolveGrant(args) {
      if (!Value.Check(parameters, args)) throw new Error("MEMORY_INVALID: 无效记忆参数");
      const input = args as Static<typeof CreateMemoryParameters> &
        Partial<Static<typeof UpdateMemoryParameters>>;
      return {
        allowSession: false,
        allowSimilar: false,
        fingerprint: JSON.stringify(args),
        ...(isGranted ? { isGranted: true } : {}),
        risk,
        summary,
        target: input.memoryId ?? input.content,
      };
    },
  };
}

export function createMemoryToolRegistrations(
  memory: MemoryRuntime,
  sessionId: string,
  workspaceId: string,
): readonly MemoryToolRegistration[] {
  const search = createSearchTool(memory, workspaceId);
  const learn = createLearnTool(memory, sessionId, workspaceId);
  const save = createSaveTool(memory, sessionId, workspaceId);
  const update = createUpdateTool(memory, workspaceId);
  const remove = createDeleteTool(memory, workspaceId);
  return [
    {
      policy: { permission: ToolPermission.READ_ONLY },
      source: MEMORY_TOOL_SOURCE,
      timeoutMs: TOOL_TIMEOUT_MS,
      tool: search,
    },
    {
      policy: {
        allowInFullAccess: true,
        permission: ToolPermission.USER_APPROVAL,
        resolveGrant(args) {
          if (!Value.Check(CreateMemoryParameters, args)) {
            throw new Error("MEMORY_INVALID: 无效记忆参数");
          }
          const settings = memory.getSettings();
          return {
            fingerprint: JSON.stringify(args),
            isGranted: settings.useMemories && settings.generateMemories,
            risk: "该内容会直接保存为长期记忆，并在适用范围内用于后续对话。",
            summary: "从对话中学习记忆",
            target: args.content,
          };
        },
      },
      source: MEMORY_TOOL_SOURCE,
      timeoutMs: TOOL_TIMEOUT_MS,
      tool: learn,
    },
    {
      policy: memoryMutationPolicy(
        CreateMemoryParameters,
        "保存长期记忆",
        "该内容会在适用范围内注入后续对话，直到被修改或删除。",
        true,
      ),
      source: MEMORY_TOOL_SOURCE,
      timeoutMs: TOOL_TIMEOUT_MS,
      tool: save,
    },
    {
      policy: memoryMutationPolicy(
        UpdateMemoryParameters,
        "改写长期记忆",
        "该操作会替换现有记忆内容，并影响后续对话。",
        true,
      ),
      source: MEMORY_TOOL_SOURCE,
      timeoutMs: TOOL_TIMEOUT_MS,
      tool: update,
    },
    {
      policy: memoryMutationPolicy(
        DeleteMemoryParameters,
        "删除长期记忆",
        "该操作会永久移除这条记忆。",
      ),
      source: MEMORY_TOOL_SOURCE,
      timeoutMs: TOOL_TIMEOUT_MS,
      tool: remove,
    },
  ];
}
