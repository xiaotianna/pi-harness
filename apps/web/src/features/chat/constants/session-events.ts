import { type HarnessEvent, HarnessEventType } from "@pi-harness/agent-runtime/harness-event";

export const TERMINAL_RUN_EVENTS = new Set<HarnessEvent["type"]>([
  HarnessEventType.RUN_ABORTED,
  HarnessEventType.RUN_COMPLETED,
  HarnessEventType.RUN_FAILED,
]);
