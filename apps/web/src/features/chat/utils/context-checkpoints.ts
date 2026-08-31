import {
  type ContextCheckpoint,
  type ContextCompactedData,
  type HarnessEvent,
  HarnessEventType,
  isContextCheckpointRestoredData,
  isContextCompactedData,
} from "@pi-harness/agent-runtime/harness-event";

export interface SessionContextCheckpoint {
  checkpoint: ContextCheckpoint;
  data: ContextCompactedData;
  eventSeq: number;
  timestamp: number;
}

export interface SessionContextCheckpointState {
  activeEventSeq: number | null;
  checkpoints: readonly SessionContextCheckpoint[];
}

export function readSessionContextCheckpoints(
  events: readonly HarnessEvent[],
): SessionContextCheckpointState {
  const checkpoints: SessionContextCheckpoint[] = [];
  const checkpointBySeq = new Map<number, SessionContextCheckpoint>();
  let activeEventSeq: number | null = null;

  for (const event of events) {
    if (event.type === HarnessEventType.CONTEXT_COMPACTED && isContextCompactedData(event.data)) {
      const item = {
        checkpoint: event.data.checkpoint,
        data: event.data,
        eventSeq: event.seq,
        timestamp: event.timestamp,
      } satisfies SessionContextCheckpoint;
      checkpoints.push(item);
      checkpointBySeq.set(event.seq, item);
      activeEventSeq = event.seq;
      continue;
    }
    if (
      event.type === HarnessEventType.CONTEXT_CHECKPOINT_RESTORED &&
      isContextCheckpointRestoredData(event.data) &&
      checkpointBySeq.has(event.data.sourceEventSeq)
    ) {
      activeEventSeq = event.data.sourceEventSeq;
    }
  }

  return { activeEventSeq, checkpoints };
}
