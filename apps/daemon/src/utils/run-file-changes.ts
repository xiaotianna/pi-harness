import {
  type HarnessEvent,
  HarnessEventType,
  RunFileChangeOperation,
  type RunId,
} from "@pi-harness/agent-runtime";
import { diffLines } from "diff";
import { isPlainObject } from "es-toolkit";

const FILE_CHANGE_SUMMARY_BUDGET_MS = 250;

export interface RunFileChange {
  after: string;
  before: string | null;
  path: string;
}

export function readRunFileChanges(events: readonly HarnessEvent[], runId: RunId): RunFileChange[] {
  const changesByPath = new Map<string, RunFileChange>();

  for (const event of events) {
    if (
      event.runId !== runId ||
      event.type !== HarnessEventType.FILE_CHANGED ||
      !isPlainObject(event.data)
    ) {
      continue;
    }
    const { after, before, path, toolName } = event.data;
    if (
      typeof after !== "string" ||
      (before !== null && typeof before !== "string") ||
      typeof path !== "string" ||
      path.length === 0
    ) {
      continue;
    }
    if (toolName === RunFileChangeOperation.REAPPLY || toolName === RunFileChangeOperation.REVERT) {
      continue;
    }
    const existing = changesByPath.get(path);
    changesByPath.set(path, { after, before: existing ? existing.before : before, path });
  }

  return [...changesByPath.values()].filter((change) => (change.before ?? "") !== change.after);
}

export function summarizeRunFileChanges(
  events: readonly HarnessEvent[],
  runId: RunId,
  includeContent: boolean,
) {
  const deadline = performance.now() + FILE_CHANGE_SUMMARY_BUDGET_MS;
  return readRunFileChanges(events, runId).map((file) => {
    const remainingMs = deadline - performance.now();
    const changes =
      remainingMs > 0
        ? diffLines(file.before ?? "", file.after, { timeout: remainingMs })
        : undefined;
    let additions = 0;
    let deletions = 0;
    for (const change of changes ?? []) {
      if (change.added) additions += change.count ?? 0;
      if (change.removed) deletions += change.count ?? 0;
    }
    return {
      path: file.path,
      status: file.before === null ? "added" : file.after === "" ? "deleted" : "modified",
      ...(changes ? { additions, deletions } : {}),
      ...(includeContent ? { before: file.before, after: file.after } : {}),
    };
  });
}
