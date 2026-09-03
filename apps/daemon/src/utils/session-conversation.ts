import {
  type HarnessEvent,
  HarnessEventType,
} from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";

function projectToolResult(event: HarnessEvent): HarnessEvent {
  if (!isPlainObject(event.data) || !isPlainObject(event.data.result)) return event;

  const { details, ...result } = event.data.result;
  const webSearchDetails =
    event.data.toolName === "web_search" && isPlainObject(details) && Array.isArray(details.results)
      ? { results: details.results }
      : undefined;

  return {
    ...event,
    data: {
      ...event.data,
      result: webSearchDetails ? { ...result, details: webSearchDetails } : result,
    },
  };
}

export function projectSessionConversationEvents(
  events: readonly HarnessEvent[],
): readonly HarnessEvent[] {
  return events.flatMap((event) => {
    if (
      event.type === HarnessEventType.MESSAGE_COMPLETED &&
      isPlainObject(event.data) &&
      event.data.role === "toolResult"
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

    if (event.type === HarnessEventType.FILE_CHANGED && isPlainObject(event.data)) {
      const { diff: _diff, ...data } = event.data;
      return [{ ...event, data }];
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
