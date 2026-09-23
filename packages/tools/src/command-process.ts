import { isPlainObject } from "es-toolkit";

export const CommandProcessStatus = {
  ABORTED: "aborted",
  COMPLETED: "completed",
  DAEMON_STOPPED: "daemon_stopped",
  FAILED: "failed",
  RUNNING: "running",
  STOPPED: "stopped",
  TIMED_OUT: "timed_out",
} as const;

export type CommandProcessStatus = (typeof CommandProcessStatus)[keyof typeof CommandProcessStatus];

export const CommandProcessEventKind = {
  EXITED: "exited",
  STARTED: "started",
  UPDATED: "updated",
} as const;

export type CommandProcessEventKind =
  (typeof CommandProcessEventKind)[keyof typeof CommandProcessEventKind];

export interface CommandProcessSnapshot {
  command: string;
  durationMs: number;
  endedAt?: number;
  exitCode: number | null;
  output: string;
  outputBytes: number;
  processId: string;
  runId: string;
  sandbox: "host" | "isolated";
  sessionId: string;
  signal: string | null;
  startedAt: number;
  status: CommandProcessStatus;
  toolCallId: string;
  truncated: boolean;
}

export function isCommandProcessSnapshot(value: unknown): value is CommandProcessSnapshot {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.command === "string" &&
    typeof value.durationMs === "number" &&
    (value.endedAt === undefined || typeof value.endedAt === "number") &&
    (value.exitCode === null || typeof value.exitCode === "number") &&
    typeof value.output === "string" &&
    typeof value.outputBytes === "number" &&
    typeof value.processId === "string" &&
    typeof value.runId === "string" &&
    (value.sandbox === "host" || value.sandbox === "isolated") &&
    typeof value.sessionId === "string" &&
    (value.signal === null || typeof value.signal === "string") &&
    typeof value.startedAt === "number" &&
    Object.values(CommandProcessStatus).includes(value.status as CommandProcessStatus) &&
    typeof value.toolCallId === "string" &&
    typeof value.truncated === "boolean"
  );
}
