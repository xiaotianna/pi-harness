import type { AgentEvent, AgentMessage } from "@earendil-works/pi-agent-core";
import { CONTEXT_WINDOW_EXCEEDED_ERROR_CODE } from "./context/context-pipeline.js";
import {
  type HarnessEventDraft,
  HarnessEventType,
  type MessageDeltaData,
  MessageDeltaKind,
  type RunFailureData,
  type RunStartedData,
  type ToolCompletedData,
  type ToolStartedData,
  type ToolUpdatedData,
} from "./harness-event.js";
import { stripAutoFollowUpMarker } from "./utils/auto-follow-up.js";

// 运行错误码（在data.code中）
const RunErrorCode = {
  // 用户主动中止
  ABORTED: "RUN_ABORTED",
  // 模型调用或agent执行失败
  FAILED: "RUN_FAILED",
  CONTEXT_WINDOW_EXCEEDED: CONTEXT_WINDOW_EXCEEDED_ERROR_CODE,
} as const;

function sanitizeAgentMessage(message: AgentMessage): AgentMessage {
  if (message.role !== "assistant") return message;
  return {
    ...message,
    content: message.content.map((part) =>
      part.type === "text" ? { ...part, text: stripAutoFollowUpMarker(part.text) } : part,
    ),
    ...(message.errorMessage === undefined
      ? {}
      : {
          errorMessage:
            message.stopReason === "aborted" ? "Agent run was aborted" : "Agent run failed",
        }),
  };
}

export interface AgentEventAdapterContext {
  modelId: string;
  providerId: string;
}

// 检查agent运行的最后一条消息，判断run最终是成功、失败还是被中止，并返回HarnessEventDraft
function readRunOutcome(messages: AgentMessage[]): HarnessEventDraft<RunFailureData | null> {
  const lastMessage = messages.at(-1);
  if (lastMessage?.role !== "assistant") {
    return { data: null, type: HarnessEventType.RUN_COMPLETED };
  }

  if (lastMessage.stopReason === "aborted") {
    return {
      data: {
        code: RunErrorCode.ABORTED,
        message: lastMessage.errorMessage ?? "Agent run was aborted",
      },
      type: HarnessEventType.RUN_ABORTED,
    };
  }

  if (lastMessage.stopReason === "error") {
    const contextErrorPrefix = `${CONTEXT_WINDOW_EXCEEDED_ERROR_CODE}:`;
    if (lastMessage.errorMessage?.startsWith(contextErrorPrefix)) {
      return {
        data: {
          code: RunErrorCode.CONTEXT_WINDOW_EXCEEDED,
          message: lastMessage.errorMessage.slice(contextErrorPrefix.length).trim(),
        },
        type: HarnessEventType.RUN_FAILED,
      };
    }
    return {
      data: {
        code: RunErrorCode.FAILED,
        message: lastMessage.errorMessage ?? "Agent run failed",
      },
      type: HarnessEventType.RUN_FAILED,
    };
  }

  return { data: null, type: HarnessEventType.RUN_COMPLETED };
}

// 把 Pi Agent 的 message_update 增量事件，转换成项目自己的 message.delta 事件
function adaptMessageDelta(event: Extract<AgentEvent, { type: "message_update" }>) {
  const update = event.assistantMessageEvent;
  switch (update.type) {
    case "text_delta":
      return {
        data: {
          contentIndex: update.contentIndex,
          delta: update.delta,
          kind: MessageDeltaKind.TEXT,
        } satisfies MessageDeltaData,
        type: HarnessEventType.MESSAGE_DELTA,
      } satisfies HarnessEventDraft<MessageDeltaData>;
    case "thinking_delta":
      return {
        data: {
          contentIndex: update.contentIndex,
          delta: update.delta,
          kind: MessageDeltaKind.THINKING,
        } satisfies MessageDeltaData,
        type: HarnessEventType.MESSAGE_DELTA,
      } satisfies HarnessEventDraft<MessageDeltaData>;
    case "toolcall_delta":
      return {
        data: {
          contentIndex: update.contentIndex,
          delta: update.delta,
          kind: MessageDeltaKind.TOOL_CALL,
        } satisfies MessageDeltaData,
        type: HarnessEventType.MESSAGE_DELTA,
      } satisfies HarnessEventDraft<MessageDeltaData>;
    default:
      return null;
  }
}

/** Pi 原始事件只在本函数内出现，对外只返回稳定的 HarnessEvent 草稿。
| Pi 原始事件 | 项目事件 |
|---|---|
| `agent_start` | `run.started` |
| `message_start` | `message.started` |
| `message_update` | `message.delta` |
| `message_end` | `message.completed` |
| `agent_end` | `run.completed/failed/aborted` |
*/
export function adaptAgentEvent(
  event: AgentEvent,
  context: AgentEventAdapterContext,
): HarnessEventDraft | null {
  switch (event.type) {
    case "agent_start":
      return {
        data: {
          modelId: context.modelId,
          providerId: context.providerId,
        } satisfies RunStartedData,
        type: HarnessEventType.RUN_STARTED,
      };
    case "agent_end":
      return readRunOutcome(event.messages);
    case "message_start":
      return { data: sanitizeAgentMessage(event.message), type: HarnessEventType.MESSAGE_STARTED };
    case "message_update":
      return adaptMessageDelta(event);
    case "message_end":
      return {
        data: sanitizeAgentMessage(event.message),
        type: HarnessEventType.MESSAGE_COMPLETED,
      };
    case "tool_execution_start":
      return {
        data: {
          arguments: event.args,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
        } satisfies ToolStartedData,
        type: HarnessEventType.TOOL_STARTED,
      };
    case "tool_execution_update":
      return {
        data: {
          arguments: event.args,
          partialResult: event.partialResult,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
        } satisfies ToolUpdatedData,
        type: HarnessEventType.TOOL_UPDATED,
      };
    case "tool_execution_end":
      return {
        data: {
          isError: event.isError,
          result: event.result,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
        } satisfies ToolCompletedData,
        type: event.isError ? HarnessEventType.TOOL_FAILED : HarnessEventType.TOOL_COMPLETED,
      };
    case "turn_start":
    case "turn_end":
      return null;
  }
}
