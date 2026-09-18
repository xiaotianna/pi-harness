import { type HarnessEvent, HarnessEventType } from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";

const TOOL_RESULT_PREVIEW_CHARACTERS = 16_000;

function projectToolResult(event: HarnessEvent): HarnessEvent {
  if (!isPlainObject(event.data) || !isPlainObject(event.data.result)) return event;

  const { details, ...result } = event.data.result;
  let remaining = TOOL_RESULT_PREVIEW_CHARACTERS;
  let resultTruncated = false;
  if (Array.isArray(result.content))
    result.content = result.content.map((part: unknown) => {
      if (!isPlainObject(part)) return part;
      if (part.type === "image")
        return {
          type: "text",
          text: `[图片：${typeof part.mimeType === "string" ? part.mimeType : "image"}]`,
        };
      if (part.type !== "text" || typeof part.text !== "string") return part;
      const text = part.text.slice(0, remaining);
      remaining -= text.length;
      resultTruncated ||= text.length !== part.text.length;
      return { ...part, text };
    });
  const webSearchDetails =
    event.data.toolName === "web_search" && isPlainObject(details) && Array.isArray(details.results)
      ? { results: details.results }
      : undefined;

  return {
    ...event,
    data: {
      ...event.data,
      ...(resultTruncated ? { resultTruncated: true } : {}),
      result: webSearchDetails ? { ...result, details: webSearchDetails } : result,
    },
  };
}

export function projectSessionConversationEvents(
  events: readonly HarnessEvent[],
): readonly HarnessEvent[] {
  return events.flatMap((event) => {
    if (event.type.startsWith("subagent.")) {
      if (
        event.type === HarnessEventType.SUBAGENT_STARTED ||
        event.type === HarnessEventType.SUBAGENT_COMPLETED ||
        event.type === HarnessEventType.SUBAGENT_FAILED ||
        event.type === HarnessEventType.SUBAGENT_ABORTED
      )
        return [event];
      if (event.type === HarnessEventType.SUBAGENT_TOOL_STARTED && isPlainObject(event.data)) {
        return [
          {
            ...event,
            data: {
              executionId: event.data.executionId,
              toolCallId: event.data.toolCallId,
              toolName: event.data.toolName,
              ...(typeof event.data.displayName === "string"
                ? { displayName: event.data.displayName }
                : {}),
            },
          },
        ];
      }
      if (
        (event.type === HarnessEventType.SUBAGENT_MESSAGE_STARTED ||
          event.type === HarnessEventType.SUBAGENT_MESSAGE_COMPLETED) &&
        isPlainObject(event.data)
      ) {
        const message = event.data.message;
        return [
          {
            ...event,
            data: {
              executionId: event.data.executionId,
              ...(isPlainObject(message) && typeof message.role === "string"
                ? { role: message.role }
                : {}),
            },
          },
        ];
      }
      if (
        (event.type === HarnessEventType.SUBAGENT_TOOL_COMPLETED ||
          event.type === HarnessEventType.SUBAGENT_TOOL_FAILED ||
          event.type === HarnessEventType.SUBAGENT_TOOL_SKIPPED) &&
        isPlainObject(event.data)
      )
        return [
          {
            ...event,
            data: { executionId: event.data.executionId, toolCallId: event.data.toolCallId },
          },
        ];
      if (event.type === HarnessEventType.SUBAGENT_MESSAGE_DELTA && isPlainObject(event.data))
        return [
          {
            ...event,
            data: {
              executionId: event.data.executionId,
              contentIndex: event.data.contentIndex,
              kind: event.data.kind,
            },
          },
        ];
      if (event.type === HarnessEventType.SUBAGENT_TOOL_UPDATED && isPlainObject(event.data)) {
        const partialResult = event.data.partialResult;
        const details = isPlainObject(partialResult) ? partialResult.details : null;
        const stage = isPlainObject(details) ? details.stage : null;
        return typeof stage === "string"
          ? [
              {
                ...event,
                data: {
                  executionId: event.data.executionId,
                  toolCallId: event.data.toolCallId,
                  partialResult: { details: { stage } },
                },
              },
            ]
          : [];
      }
      return [];
    }

    if (
      event.type === HarnessEventType.MESSAGE_COMPLETED &&
      isPlainObject(event.data) &&
      (event.data.role === "toolResult" || event.data.isInternal === true)
    ) {
      return [];
    }

    if (
      event.type === HarnessEventType.MESSAGE_STARTED &&
      isPlainObject(event.data) &&
      typeof event.data.role === "string"
    ) {
      return [{ ...event, data: { role: event.data.role } }];
    }

    if (event.type === HarnessEventType.CONTEXT_USAGE_SNAPSHOT && isPlainObject(event.data)) {
      const { messages: _messages, ...data } = event.data;
      return [{ ...event, data }];
    }

    if (event.type === HarnessEventType.FILE_CHANGED && isPlainObject(event.data)) {
      const { before, after, diff: _diff, ...data } = event.data;
      return [
        {
          ...event,
          data: { ...data, hasContent: true, isAdded: before === null, isDeleted: after === "" },
        },
      ];
    }

    if (
      event.type === HarnessEventType.TOOL_COMPLETED ||
      event.type === HarnessEventType.TOOL_FAILED
    ) {
      return [projectToolResult(event)];
    }

    return [event];
  });
}
