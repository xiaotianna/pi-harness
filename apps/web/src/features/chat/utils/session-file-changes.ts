import {
  type HarnessEvent,
  HarnessEventType,
  RunFileChangeOperation,
} from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";
import { type ChatFileChange, ChatFileChangeStatus } from "../data/chat";

interface FileChangeState {
  after?: string;
  before?: string | null;
  sessionId?: string;
  runId?: string;
  status?: ChatFileChangeStatus;
  path: string;
  seq: number;
}

function readFileChange(event: HarnessEvent): FileChangeState | null {
  if (event.type !== HarnessEventType.FILE_CHANGED || !isPlainObject(event.data)) return null;

  const { after, before, path, toolName } = event.data;
  if (
    event.data.hasContent === true &&
    typeof path === "string" &&
    event.runId &&
    toolName !== RunFileChangeOperation.REAPPLY &&
    toolName !== RunFileChangeOperation.REVERT
  ) {
    return {
      path,
      seq: event.seq,
      sessionId: event.sessionId,
      runId: event.runId,
      status:
        event.data.isAdded === true
          ? ChatFileChangeStatus.ADDED
          : event.data.isDeleted === true
            ? ChatFileChangeStatus.DELETED
            : ChatFileChangeStatus.MODIFIED,
    };
  }
  if (toolName === RunFileChangeOperation.REAPPLY || toolName === RunFileChangeOperation.REVERT) {
    return null;
  }
  if (
    typeof after !== "string" ||
    (before !== null && typeof before !== "string") ||
    typeof path !== "string" ||
    path.length === 0
  ) {
    return null;
  }

  return { after, before, path, seq: event.seq };
}

export function readRevertedSessionRunIds(events: readonly HarnessEvent[]): ReadonlySet<string> {
  const revertedRunIds = new Set<string>();

  for (const event of events) {
    if (
      !event.runId ||
      event.type !== HarnessEventType.FILE_CHANGED ||
      !isPlainObject(event.data)
    ) {
      continue;
    }
    if (event.data.toolName === RunFileChangeOperation.REVERT) {
      revertedRunIds.add(event.runId);
    } else if (event.data.toolName === RunFileChangeOperation.REAPPLY) {
      revertedRunIds.delete(event.runId);
    }
  }

  return revertedRunIds;
}

export function summarizeSessionFileChangesByRun(
  events: readonly HarnessEvent[],
): ReadonlyMap<string, readonly ChatFileChange[]> {
  const changesByRunId = new Map<string, Map<string, FileChangeState>>();

  for (const event of events) {
    const change = readFileChange(event);
    if (!change || !event.runId) continue;

    const changesByPath = changesByRunId.get(event.runId) ?? new Map();
    const existing = changesByPath.get(change.path);
    changesByPath.set(change.path, {
      ...change,
      ...(existing?.before === undefined ? {} : { before: existing.before }),
    });
    changesByRunId.set(event.runId, changesByPath);
  }

  return new Map(
    [...changesByRunId].map(([runId, changesByPath]) => [
      runId,
      [...changesByPath.values()]
        .filter((change) => change.after === undefined || (change.before ?? "") !== change.after)
        .sort((left, right) => right.seq - left.seq)
        .map(({ after, before, path, seq, sessionId, runId, status }) => ({
          ...(after === undefined ? {} : { after }),
          ...(before === undefined ? {} : { before }),
          ...(sessionId === undefined ? {} : { sessionId }),
          ...(runId === undefined ? {} : { runId }),
          eventSeq: seq,
          path,
          status:
            status ??
            (before === null
              ? ChatFileChangeStatus.ADDED
              : after === ""
                ? ChatFileChangeStatus.DELETED
                : ChatFileChangeStatus.MODIFIED),
        })),
    ]),
  );
}
