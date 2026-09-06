import {
  type HarnessEvent,
  HarnessEventType,
  type InputRequestedData,
  isInputRequestedData,
} from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";

export function userInputOptionMarker(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

export function findPendingUserInput(events: readonly HarnessEvent[]): InputRequestedData | null {
  const pending = new Map<string, InputRequestedData>();
  for (const event of events) {
    if (event.type === HarnessEventType.INPUT_REQUESTED && isInputRequestedData(event.data)) {
      pending.set(event.data.inputId, event.data);
    } else if (
      (event.type === HarnessEventType.INPUT_RESOLVED ||
        event.type === HarnessEventType.INPUT_EXPIRED) &&
      isPlainObject(event.data) &&
      typeof event.data.inputId === "string"
    ) {
      pending.delete(event.data.inputId);
    } else if (
      event.type === HarnessEventType.RUN_ABORTED ||
      event.type === HarnessEventType.RUN_COMPLETED ||
      event.type === HarnessEventType.RUN_FAILED
    ) {
      pending.clear();
    }
  }
  return [...pending.values()].at(-1) ?? null;
}
