import {
  type ApprovalRequestedData,
  type HarnessEvent,
  HarnessEventType,
  type RunId,
} from "@pi-harness/agent-runtime";
import { isPlainObject } from "es-toolkit";

export interface InterruptedRun {
  pendingApprovals: readonly ApprovalRequestedData[];
  runId: RunId;
}

function readApprovalRequest(event: HarnessEvent): ApprovalRequestedData | null {
  if (
    !isPlainObject(event.data) ||
    typeof event.data.approvalId !== "string" ||
    typeof event.data.expiresAt !== "number" ||
    typeof event.data.risk !== "string" ||
    typeof event.data.summary !== "string" ||
    typeof event.data.target !== "string" ||
    typeof event.data.toolCallId !== "string" ||
    typeof event.data.toolName !== "string"
  ) {
    return null;
  }
  return event.data as unknown as ApprovalRequestedData;
}

export function findInterruptedRun(events: readonly HarnessEvent[]): InterruptedRun | null {
  let runId: RunId | null = null;
  const pendingApprovals = new Map<string, ApprovalRequestedData>();

  for (const event of events) {
    if (event.type === HarnessEventType.RUN_STARTED && event.runId) {
      runId = event.runId;
      pendingApprovals.clear();
      continue;
    }
    if (runId === null || event.runId !== runId) continue;

    if (event.type === HarnessEventType.APPROVAL_REQUESTED) {
      const request = readApprovalRequest(event);
      if (request) pendingApprovals.set(request.approvalId, request);
      continue;
    }
    if (event.type === HarnessEventType.APPROVAL_RESOLVED && isPlainObject(event.data)) {
      if (typeof event.data.approvalId === "string") {
        pendingApprovals.delete(event.data.approvalId);
      }
      continue;
    }
    if (
      (event.type === HarnessEventType.TOOL_COMPLETED ||
        event.type === HarnessEventType.TOOL_FAILED) &&
      isPlainObject(event.data) &&
      typeof event.data.toolCallId === "string"
    ) {
      for (const [approvalId, request] of pendingApprovals) {
        if (request.toolCallId === event.data.toolCallId) pendingApprovals.delete(approvalId);
      }
      continue;
    }
    if (
      event.type === HarnessEventType.RUN_ABORTED ||
      event.type === HarnessEventType.RUN_COMPLETED ||
      event.type === HarnessEventType.RUN_FAILED
    ) {
      runId = null;
      pendingApprovals.clear();
    }
  }

  return runId === null ? null : { pendingApprovals: [...pendingApprovals.values()], runId };
}
