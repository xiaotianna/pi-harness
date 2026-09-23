import { type ChildProcess, type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { readSandboxPolicy, SandboxProfile } from "@pi-harness/policy";
import { type SandboxedProcess, spawnSandboxedProcess } from "@pi-harness/sandbox";
import {
  CommandProcessEventKind,
  type CommandProcessEventKind as CommandProcessEventKindValue,
  type CommandProcessSnapshot,
  CommandProcessStatus,
  type CommandProcessStatus as CommandProcessStatusValue,
} from "./command-process.js";
import { resolveToolPath, type WorkspaceToolContext } from "./lib/tool-context.js";
import type { FileChangeDetails } from "./utils/file.js";
import {
  collectWorkspaceFileChanges,
  type WorkspaceTextSnapshot,
} from "./utils/workspace-file-changes.js";

const MAX_CAPTURE_BYTES = 1024 * 1024;
const MAX_VISIBLE_OUTPUT_BYTES = 64 * 1024;
const UPDATE_THROTTLE_MS = 100;
const MAX_RETAINED_PROCESSES = 100;
const MAX_ACTIVE_PROCESSES = 8;
const FILE_CHANGE_TIMEOUT_MS = 30_000;
const WATCHDOG_READY_TIMEOUT_MS = 2_000;
const WATCHDOG_RELEASE_TIMEOUT_MS = 500;
const HOST_ENVIRONMENT_NAMES = [
  "APPDATA",
  "COMSPEC",
  "HOME",
  "LANG",
  "LC_ALL",
  "LOCALAPPDATA",
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "USER",
  "USERPROFILE",
] as const;

interface ManagedProcess {
  child: ChildProcessWithoutNullStreams;
  close(): Promise<void>;
  getViolations(): readonly string[];
}

interface CommandApprovalState {
  pending: number;
}

interface CommandProcessRecord {
  approvalState: CommandApprovalState;
  beforeSnapshot: WorkspaceTextSnapshot | null;
  command: string;
  desiredStatus: CommandProcessStatusValue | null;
  endedAt?: number;
  exitCode: number | null;
  fileChanges: readonly FileChangeDetails[];
  fileChangesTruncated: boolean;
  finalized: boolean;
  hasDeliveredFileChanges: boolean;
  isDetached: boolean;
  isHandlingExit: boolean;
  lifecycle: AbortController;
  managed: ManagedProcess;
  output: Buffer;
  outputBytes: number;
  processId: string;
  runId: string;
  sandbox: "host" | "isolated";
  signal: string | null;
  startedAt: number;
  startedEvent: Promise<void>;
  status: CommandProcessStatusValue;
  terminal: Promise<CommandProcessSnapshot>;
  resolveTerminal: (snapshot: CommandProcessSnapshot) => void;
  timeout: ReturnType<typeof setTimeout>;
  toolCallId: string;
  truncated: boolean;
  updateTimer?: ReturnType<typeof setTimeout>;
  workspaceRoot: string;
}

export interface CommandProcessManagerOptions {
  context: WorkspaceToolContext;
  emitEvent: (
    kind: CommandProcessEventKindValue,
    snapshot: CommandProcessSnapshot,
  ) => Promise<void> | void;
  emitFileChanges: (input: {
    changes: readonly FileChangeDetails[];
    runId: string;
    toolCallId: string;
  }) => Promise<void> | void;
  getSkillReadPaths?: () => readonly string[];
  onError: (error: unknown, processId: string) => void;
  sessionId: string;
}

export interface StartCommandProcessInput {
  beforeSnapshot: WorkspaceTextSnapshot | null;
  command: string;
  runId: string;
  signal?: AbortSignal;
  timeoutMs: number;
  toolCallId: string;
}

export interface CommandProcessWaitResult {
  fileChanges: readonly FileChangeDetails[];
  fileChangesTruncated: boolean;
  snapshot: CommandProcessSnapshot;
}

function shellInvocation(command: string): { args: string[]; command: string } {
  return process.platform === "win32"
    ? { args: ["/d", "/s", "/c", command], command: process.env.COMSPEC ?? "cmd.exe" }
    : { args: ["-lc", command], command: process.env.SHELL ?? "/bin/sh" };
}

function isRunning(child: ChildProcess): boolean {
  return child.exitCode === null && child.signalCode === null;
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (!isRunning(child)) return;
  await Promise.race([
    new Promise<void>((resolve) => child.once("exit", () => resolve())),
    delay(timeoutMs),
  ]);
}

async function superviseProcess(managed: ManagedProcess): Promise<ManagedProcess> {
  const targetPid = managed.child.pid;
  if (targetPid === undefined) {
    await managed.close();
    throw new Error("COMMAND_PROCESS_WATCHDOG_FAILED: 命令进程 PID 不可用");
  }

  const watchdog = spawn(
    process.execPath,
    [fileURLToPath(new URL("./command-process-watchdog.mjs", import.meta.url)), String(targetPid)],
    {
      detached: true,
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("COMMAND_PROCESS_WATCHDOG_FAILED: watchdog 启动超时")),
        WATCHDOG_READY_TIMEOUT_MS,
      );
      const cleanup = () => {
        clearTimeout(timeout);
        watchdog.off("error", handleError);
        watchdog.off("exit", handleExit);
        watchdog.off("message", handleMessage);
      };
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const handleExit = () => {
        cleanup();
        reject(new Error("COMMAND_PROCESS_WATCHDOG_FAILED: watchdog 提前退出"));
      };
      const handleMessage = (message: unknown) => {
        if (
          typeof message !== "object" ||
          message === null ||
          !("type" in message) ||
          message.type !== "ready"
        ) {
          return;
        }
        cleanup();
        resolve();
      };
      watchdog.once("error", handleError);
      watchdog.once("exit", handleExit);
      watchdog.on("message", handleMessage);
    });
  } catch (error: unknown) {
    watchdog.kill("SIGKILL");
    await managed.close();
    throw error;
  }

  let releaseTask: Promise<void> | undefined;
  const release = () =>
    (releaseTask ??= (async () => {
      if (!isRunning(watchdog)) return;
      if (watchdog.connected) {
        await new Promise<void>((resolve) => {
          watchdog.send({ type: "release" }, () => resolve());
        });
      }
      await waitForExit(watchdog, WATCHDOG_RELEASE_TIMEOUT_MS);
      if (isRunning(watchdog)) watchdog.kill("SIGKILL");
    })());
  let closeTask: Promise<void> | undefined;

  return {
    ...managed,
    close: () =>
      (closeTask ??= (async () => {
        try {
          await managed.close();
        } finally {
          if (!isRunning(managed.child)) await release();
        }
      })()),
  };
}

function signalProcessTree(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (child.pid === undefined || !isRunning(child)) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
  }
}

async function closeHostProcess(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (isRunning(child)) {
    signalProcessTree(child, "SIGINT");
    await waitForExit(child, 750);
  }
  if (isRunning(child)) {
    signalProcessTree(child, "SIGTERM");
    await waitForExit(child, 750);
  }
  if (isRunning(child)) {
    signalProcessTree(child, "SIGKILL");
    await waitForExit(child, 1_500);
  }
  child.stdin.destroy();
  child.stdout.destroy();
  child.stderr.destroy();
}

function visibleOutput(output: Buffer): string {
  return output
    .subarray(Math.max(0, output.byteLength - MAX_VISIBLE_OUTPUT_BYTES))
    .toString("utf8");
}

export class CommandProcessManager {
  private readonly records = new Map<string, CommandProcessRecord>();

  public constructor(private readonly options: CommandProcessManagerOptions) {}

  public listActive(): readonly CommandProcessSnapshot[] {
    return [...this.records.values()]
      .filter((record) => record.status === CommandProcessStatus.RUNNING)
      .map((record) => this.snapshot(record));
  }

  public get(processId: string): CommandProcessSnapshot | null {
    const record = this.records.get(processId);
    return record ? this.snapshot(record) : null;
  }

  public async start(input: StartCommandProcessInput): Promise<CommandProcessSnapshot> {
    input.signal?.throwIfAborted();
    if (this.listActive().length >= MAX_ACTIVE_PROCESSES) {
      throw new Error("COMMAND_PROCESS_LIMIT: 当前 Session 的后台命令已达到上限");
    }
    const processId = randomUUID();
    const workspaceRoot = await resolveToolPath(this.options.context, ".");
    const isFullAccess = this.options.context.isFullAccess?.() === true;
    const approvalState = { pending: 0 };
    const lifecycle = new AbortController();
    const signal = input.signal
      ? AbortSignal.any([input.signal, lifecycle.signal])
      : lifecycle.signal;
    const managed = isFullAccess
      ? await this.spawnHost(input.command, workspaceRoot)
      : await this.spawnSandboxed({ ...input, signal }, processId, workspaceRoot, approvalState);
    let resolveTerminal: (snapshot: CommandProcessSnapshot) => void = () => undefined;
    const terminal = new Promise<CommandProcessSnapshot>((resolve) => {
      resolveTerminal = resolve;
    });
    const record: CommandProcessRecord = {
      approvalState,
      beforeSnapshot: input.beforeSnapshot,
      command: input.command,
      desiredStatus: null,
      exitCode: null,
      fileChanges: [],
      fileChangesTruncated: false,
      finalized: false,
      hasDeliveredFileChanges: false,
      isDetached: false,
      isHandlingExit: false,
      lifecycle,
      managed,
      output: Buffer.alloc(0),
      outputBytes: 0,
      processId,
      runId: input.runId,
      sandbox: isFullAccess ? "host" : "isolated",
      signal: null,
      startedAt: Date.now(),
      startedEvent: Promise.resolve(),
      status: CommandProcessStatus.RUNNING,
      terminal,
      resolveTerminal,
      timeout: setTimeout(() => {
        void this.stopWithStatus(processId, CommandProcessStatus.TIMED_OUT);
      }, input.timeoutMs),
      toolCallId: input.toolCallId,
      truncated: false,
      workspaceRoot,
    };
    this.records.set(processId, record);
    this.prune();
    record.startedEvent = this.safeEmit(CommandProcessEventKind.STARTED, record);
    this.observe(record);
    await record.startedEvent;
    if (input.signal?.aborted) {
      await this.stopWithStatus(processId, CommandProcessStatus.ABORTED);
      input.signal.throwIfAborted();
    }
    return this.snapshot(record);
  }

  public async wait(processId: string, yieldTimeMs: number): Promise<CommandProcessSnapshot> {
    const record = this.records.get(processId);
    if (!record) throw new Error("COMMAND_PROCESS_NOT_FOUND: 后台命令不存在");
    const first = await Promise.race([
      record.terminal,
      delay(yieldTimeMs).then(() => this.snapshot(record)),
    ]);
    if (first.status !== CommandProcessStatus.RUNNING || record.approvalState.pending === 0)
      return first;
    while (record.approvalState.pending > 0 && record.status === CommandProcessStatus.RUNNING) {
      await Promise.race([record.terminal.then(() => undefined), delay(100)]);
    }
    if (record.status !== CommandProcessStatus.RUNNING) return record.terminal;
    return Promise.race([record.terminal, delay(yieldTimeMs).then(() => this.snapshot(record))]);
  }

  public detach(processId: string): void {
    const record = this.records.get(processId);
    if (!record) return;
    record.isDetached = true;
    if (record.finalized) void this.deliverFileChanges(record);
  }

  public consumeFileChanges(processId: string): CommandProcessWaitResult {
    const record = this.records.get(processId);
    if (!record?.finalized) {
      throw new Error("COMMAND_PROCESS_NOT_FINISHED: 命令尚未结束");
    }
    record.hasDeliveredFileChanges = true;
    return {
      fileChanges: record.fileChanges,
      fileChangesTruncated: record.fileChangesTruncated,
      snapshot: this.snapshot(record),
    };
  }

  public stop(processId: string): Promise<boolean> {
    return this.stopWithStatus(processId, CommandProcessStatus.STOPPED);
  }

  public async stopRun(runId: string): Promise<void> {
    await Promise.all(
      [...this.records.values()]
        .filter(
          (record) => record.runId === runId && record.status === CommandProcessStatus.RUNNING,
        )
        .map((record) => this.stopWithStatus(record.processId, CommandProcessStatus.ABORTED)),
    );
  }

  public async close(): Promise<void> {
    await Promise.all(
      [...this.records.values()]
        .filter((record) => record.status === CommandProcessStatus.RUNNING)
        .map((record) =>
          this.stopWithStatus(record.processId, CommandProcessStatus.DAEMON_STOPPED),
        ),
    );
  }

  private async spawnHost(command: string, workspaceRoot: string): Promise<ManagedProcess> {
    const child = spawn(command, {
      cwd: workspaceRoot,
      detached: process.platform !== "win32",
      env: Object.fromEntries(
        HOST_ENVIRONMENT_NAMES.flatMap((name) =>
          process.env[name] === undefined ? [] : [[name, process.env[name]]],
        ),
      ),
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return superviseProcess({
      child,
      close: () => closeHostProcess(child),
      getViolations: () => [],
    });
  }

  private async spawnSandboxed(
    input: StartCommandProcessInput,
    processId: string,
    workspaceRoot: string,
    approvalState: CommandApprovalState,
  ): Promise<ManagedProcess> {
    const policy = await readSandboxPolicy(this.options.context.globalRoot, input.signal);
    const shell = shellInvocation(input.command);
    const sandboxed: SandboxedProcess = await spawnSandboxedProcess({
      allowedDomains: policy.network.allowedDomains,
      args: shell.args,
      command: shell.command,
      commandId: processId,
      credentials: this.options.context.getSandboxCredentials?.() ?? [],
      deniedDomains: policy.network.deniedDomains,
      environment: {},
      isWorkspaceWritable: policy.profile === SandboxProfile.WORKSPACE_WRITE,
      onNetworkApproval: async ({ host, port }) => {
        approvalState.pending += 1;
        try {
          return (
            (await this.options.context.onNetworkAccessRequested?.(
              { host, ...(port === undefined ? {} : { port }), toolCallId: input.toolCallId },
              input.signal,
            )) ?? false
          );
        } finally {
          approvalState.pending -= 1;
        }
      },
      protectedPaths: [
        ...(this.options.context.protectedPaths ?? []),
        this.options.context.globalRoot,
      ],
      readPaths: this.options.getSkillReadPaths?.() ?? [],
      ...(input.signal === undefined ? {} : { signal: input.signal }),
      workspaceRoot,
    });
    return superviseProcess({
      child: sandboxed.process,
      close: sandboxed.close,
      getViolations: sandboxed.getViolations ?? (() => []),
    });
  }

  private observe(record: CommandProcessRecord): void {
    record.managed.child.stdout.on("data", (chunk: Buffer | string) =>
      this.appendOutput(record, chunk),
    );
    record.managed.child.stderr.on("data", (chunk: Buffer | string) =>
      this.appendOutput(record, chunk),
    );
    record.managed.child.once("error", (error) => {
      this.appendOutput(record, `\n命令进程错误：${error.message}\n`);
      void this.handleExit(record, null, null);
    });
    record.managed.child.once("exit", (exitCode, signal) => {
      void this.handleExit(record, exitCode, signal);
    });
    if (!isRunning(record.managed.child)) {
      void this.handleExit(record, record.managed.child.exitCode, record.managed.child.signalCode);
    }
  }

  private async handleExit(
    record: CommandProcessRecord,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
  ): Promise<void> {
    if (record.finalized || record.isHandlingExit) return;
    record.isHandlingExit = true;
    if (record.sandbox === "isolated" && record.desiredStatus === null && exitCode !== 0) {
      const violations = record.managed.getViolations();
      if (violations.length > 0 && this.options.context.onHostExecutionRequested) {
        const changedFileCount = await this.collectFileChanges(record);
        let approved = false;
        record.approvalState.pending += 1;
        try {
          approved = await this.options.context.onHostExecutionRequested(
            {
              changedFileCount,
              command: record.command,
              reason: violations.join("\n").slice(0, 8_192),
              toolCallId: record.toolCallId,
            },
            record.lifecycle.signal,
          );
        } catch (error: unknown) {
          this.options.onError(error, record.processId);
        } finally {
          record.approvalState.pending -= 1;
        }
        if (approved && !record.finalized && record.desiredStatus === null) {
          await record.managed.close();
          record.managed = await this.spawnHost(record.command, record.workspaceRoot);
          record.sandbox = "host";
          record.isHandlingExit = false;
          this.observe(record);
          await this.safeEmit(CommandProcessEventKind.UPDATED, record);
          return;
        }
      }
    }
    await this.finalize(record, exitCode, signal);
  }

  private appendOutput(record: CommandProcessRecord, chunk: Buffer | string): void {
    if (record.finalized) return;
    const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    record.outputBytes += next.byteLength;
    const combined = Buffer.concat([record.output, next]);
    record.truncated ||= combined.byteLength > MAX_CAPTURE_BYTES;
    record.output = combined.subarray(Math.max(0, combined.byteLength - MAX_CAPTURE_BYTES));
    if (record.updateTimer) return;
    record.updateTimer = setTimeout(() => {
      delete record.updateTimer;
      void this.safeEmit(CommandProcessEventKind.UPDATED, record);
    }, UPDATE_THROTTLE_MS);
  }

  private async finalize(
    record: CommandProcessRecord,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
  ): Promise<void> {
    if (record.finalized) return;
    record.finalized = true;
    record.lifecycle.abort();
    clearTimeout(record.timeout);
    if (record.updateTimer) clearTimeout(record.updateTimer);
    record.endedAt = Date.now();
    record.exitCode = exitCode;
    record.signal = signal;
    record.status =
      record.desiredStatus ??
      (exitCode === 0 ? CommandProcessStatus.COMPLETED : CommandProcessStatus.FAILED);
    try {
      await record.managed.close();
    } catch (error: unknown) {
      this.options.onError(error, record.processId);
    }
    await this.collectFileChanges(record);
    await record.startedEvent;
    await this.safeEmit(CommandProcessEventKind.EXITED, record);
    record.resolveTerminal(this.snapshot(record));
    if (record.isDetached) await this.deliverFileChanges(record);
  }

  private async collectFileChanges(record: CommandProcessRecord): Promise<number> {
    if (record.beforeSnapshot === null) {
      record.fileChangesTruncated = true;
      return 0;
    }
    try {
      const changes = await collectWorkspaceFileChanges(
        this.options.context,
        record.beforeSnapshot,
        AbortSignal.timeout(FILE_CHANGE_TIMEOUT_MS),
      );
      record.fileChanges = changes.changes;
      record.fileChangesTruncated = changes.truncated;
      return changes.changes.length;
    } catch (error: unknown) {
      record.fileChangesTruncated = true;
      this.options.onError(error, record.processId);
      return 0;
    }
  }

  private async stopWithStatus(
    processId: string,
    status: CommandProcessStatusValue,
  ): Promise<boolean> {
    const record = this.records.get(processId);
    if (!record || record.status !== CommandProcessStatus.RUNNING) return false;
    record.desiredStatus = status;
    record.lifecycle.abort();
    try {
      await record.managed.close();
    } catch (error: unknown) {
      this.options.onError(error, processId);
    }
    if (!record.finalized) await this.finalize(record, null, null);
    await record.terminal;
    return true;
  }

  private async deliverFileChanges(record: CommandProcessRecord): Promise<void> {
    if (record.hasDeliveredFileChanges || record.fileChanges.length === 0) return;
    record.hasDeliveredFileChanges = true;
    try {
      await this.options.emitFileChanges({
        changes: record.fileChanges,
        runId: record.runId,
        toolCallId: record.toolCallId,
      });
    } catch (error: unknown) {
      this.options.onError(error, record.processId);
    }
  }

  private async safeEmit(
    kind: CommandProcessEventKindValue,
    record: CommandProcessRecord,
  ): Promise<void> {
    try {
      await this.options.emitEvent(kind, this.snapshot(record));
    } catch (error: unknown) {
      this.options.onError(error, record.processId);
    }
  }

  private snapshot(record: CommandProcessRecord): CommandProcessSnapshot {
    const now = record.endedAt ?? Date.now();
    return {
      command: record.command,
      durationMs: Math.max(0, now - record.startedAt),
      ...(record.endedAt === undefined ? {} : { endedAt: record.endedAt }),
      exitCode: record.exitCode,
      output: visibleOutput(record.output),
      outputBytes: record.outputBytes,
      processId: record.processId,
      runId: record.runId,
      sandbox: record.sandbox,
      sessionId: this.options.sessionId,
      signal: record.signal,
      startedAt: record.startedAt,
      status: record.status,
      toolCallId: record.toolCallId,
      truncated: record.truncated || record.output.byteLength > MAX_VISIBLE_OUTPUT_BYTES,
    };
  }

  private prune(): void {
    if (this.records.size <= MAX_RETAINED_PROCESSES) return;
    for (const [processId, record] of this.records) {
      if (record.status === CommandProcessStatus.RUNNING) continue;
      this.records.delete(processId);
      if (this.records.size <= MAX_RETAINED_PROCESSES) break;
    }
  }
}
