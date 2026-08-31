import type { AgentTool } from "@earendil-works/pi-agent-core";
import { type Static, Type } from "typebox";

const SearchSessionHistoryParameters = Type.Object({
  maxResults: Type.Optional(Type.Integer({ maximum: 20, minimum: 1 })),
  query: Type.String({ maxLength: 500, minLength: 1 }),
});

const RestoreContextCheckpointParameters = Type.Object({
  steps: Type.Optional(Type.Integer({ maximum: 10, minimum: 1 })),
});

const ResetWorkingStateParameters = Type.Object({
  reason: Type.String({ maxLength: 1_000, minLength: 1 }),
});

export interface SessionHistoryMatch {
  excerpt: string;
  messageIndex: number;
  role: "assistant" | "toolResult" | "user";
}

export interface SessionHistorySearchResult {
  matches: SessionHistoryMatch[];
  query: string;
}

export type SessionHistorySearchHandler = (
  input: Static<typeof SearchSessionHistoryParameters>,
) => Promise<SessionHistorySearchResult> | SessionHistorySearchResult;

export type ContextCheckpointRestoreHandler = (steps: number) => Promise<number> | number;
export type WorkingStateResetHandler = (reason: string) => Promise<void> | void;

export function createSearchSessionHistoryTool(
  onSearch: SessionHistorySearchHandler,
): AgentTool<typeof SearchSessionHistoryParameters, SessionHistorySearchResult> {
  return {
    description:
      "在当前 Session 的完整历史消息中检索旧事实。checkpoint 不含所需信息时使用；代码事实仍需重新读取 workspace。",
    executionMode: "parallel",
    label: "Search session history",
    name: "search_session_history",
    parameters: SearchSessionHistoryParameters,
    async execute(_toolCallId, input) {
      const result = await onSearch(input);
      return { content: [{ text: JSON.stringify(result), type: "text" }], details: result };
    },
  };
}

export function createRestoreContextCheckpointTool(
  onRestore: ContextCheckpointRestoreHandler,
): AgentTool<typeof RestoreContextCheckpointParameters, { sourceEventSeq: number }> {
  return {
    description:
      "将当前工作 checkpoint 回退到较早版本。仅在用户要求回退，或当前 checkpoint 与完整历史明显冲突时使用。",
    executionMode: "sequential",
    label: "Restore context checkpoint",
    name: "restore_context_checkpoint",
    parameters: RestoreContextCheckpointParameters,
    async execute(_toolCallId, input) {
      const result = { sourceEventSeq: await onRestore(input.steps ?? 1) };
      return { content: [{ text: JSON.stringify(result), type: "text" }], details: result };
    },
  };
}

export function createResetWorkingStateTool(
  onReset: WorkingStateResetHandler,
): AgentTool<typeof ResetWorkingStateParameters, { reason: string }> {
  return {
    description:
      "清空上一任务遗留的 Plan 和 Todos。仅当当前用户请求已替换或明确结束上一任务时使用；不会删除 Session 历史。",
    executionMode: "sequential",
    label: "Reset working state",
    name: "reset_working_state",
    parameters: ResetWorkingStateParameters,
    async execute(_toolCallId, input) {
      await onReset(input.reason);
      return {
        content: [{ text: JSON.stringify({ reason: input.reason }), type: "text" }],
        details: { reason: input.reason },
      };
    },
  };
}
