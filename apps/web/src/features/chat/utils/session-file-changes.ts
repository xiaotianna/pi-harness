import {
  type HarnessEvent,
  HarnessEventType,
  RunFileChangeOperation,
} from "@pi-harness/agent-runtime/harness-event";
import { isPlainObject } from "es-toolkit";
import { type ChatFileChange, ChatFileChangeStatus } from "../data/chat";

interface FileChangeState {
  after: string;
  before: string | null;
  path: string;
  seq: number;
}

function readFileChange(event: HarnessEvent): FileChangeState | null {
  if (event.type !== HarnessEventType.FILE_CHANGED || !isPlainObject(event.data)) return null;

  const { after, before, path, toolName } = event.data;
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
      before: existing ? existing.before : change.before,
    });
    changesByRunId.set(event.runId, changesByPath);
  }

  return new Map(
    [...changesByRunId].map(([runId, changesByPath]) => [
      runId,
      [...changesByPath.values()]
        .filter((change) => (change.before ?? "") !== change.after)
        .sort((left, right) => right.seq - left.seq)
        .map(({ after, before, path }) => ({
          after,
          before,
          path,
          status:
            before === null
              ? ChatFileChangeStatus.ADDED
              : after === ""
                ? ChatFileChangeStatus.DELETED
                : ChatFileChangeStatus.MODIFIED,
        })),
    ]),
  );
}
