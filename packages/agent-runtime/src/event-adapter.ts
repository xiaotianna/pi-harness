import type { AgentEvent, AgentMessage } from "@earendil-works/pi-agent-core";
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

const RunErrorCode = {
  ABORTED: "RUN_ABORTED",
  FAILED: "RUN_FAILED",
} as const;

function sanitizeAgentMessage(message: AgentMessage): AgentMessage {
  if (message.role !== "assistant" || message.errorMessage === undefined) return message;
  return {
    ...message,
    errorMessage: message.stopReason === "aborted" ? "Agent run was aborted" : "Agent run failed",
  };
}

export interface AgentEventAdapterContext {
  modelId: string;
  providerId: string;
}

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

/** Pi 原始事件只在本函数内出现，对外只返回稳定的 HarnessEvent 草稿。 */
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
