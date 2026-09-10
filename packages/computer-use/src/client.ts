import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import { Value } from "typebox/value";
import {
  type ComputerAction,
  type ComputerActionResult,
  ComputerActionResultSchema,
  type ComputerObservation,
  ComputerObservationSchema,
  type ComputerUseRequest,
  ComputerUseResponseSchema,
  type ObserveOptions,
} from "./protocol.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 24 * 1024 * 1024;

interface PendingRequest {
  cleanup: () => void;
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
}

export interface ComputerUseClientOptions {
  helperPath: string;
  timeoutMs?: number;
}

export class ComputerUseError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ComputerUseError";
  }
}

export class ComputerUseClient {
  private buffer = "";
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private stderr = "";

  public constructor(private readonly options: ComputerUseClientOptions) {
    if (!isAbsolute(options.helperPath)) throw new Error("computer-use helperPath 必须是绝对路径");
    if (options.timeoutMs !== undefined && options.timeoutMs < 1) {
      throw new Error("computer-use timeoutMs 必须大于 0");
    }
  }

  public async start(signal?: AbortSignal): Promise<void> {
    if (process.platform !== "darwin") throw new Error("computer-use 当前仅支持 macOS");
    if (this.child !== null) return;

    const child = spawn(this.options.helperPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.child = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.consume(chunk));
    child.stderr.on("data", (chunk: string) => {
      this.stderr = `${this.stderr}${chunk}`.slice(-16_000);
    });
    child.once("error", (error) => this.stop(error));
    child.once("exit", (code, exitSignal) => {
      this.stop(
        new Error(
          `computer-use helper 已退出 (${exitSignal ?? code ?? "unknown"})${this.stderr ? `: ${this.stderr.trim()}` : ""}`,
        ),
      );
    });

    await this.request("ping", {}, signal);
  }

  public async observe(
    scopeId: string,
    options: ObserveOptions = {},
    signal?: AbortSignal,
  ): Promise<ComputerObservation> {
    const result = await this.request(
      "observe",
      {
        includeScreenshot: options.includeScreenshot ?? true,
        maxDepth: options.maxDepth ?? 20,
        maxNodes: options.maxNodes ?? 1_000,
        scopeId,
      },
      signal,
    );
    if (!Value.Check(ComputerObservationSchema, result)) {
      throw new ComputerUseError(
        "INVALID_HELPER_RESPONSE",
        "computer-use helper 返回了无效观察结果",
      );
    }
    return result;
  }

  public async act(
    scopeId: string,
    observationId: string,
    action: ComputerAction,
    signal?: AbortSignal,
  ): Promise<ComputerActionResult> {
    const result = await this.request("act", { action, observationId, scopeId }, signal);
    if (!Value.Check(ComputerActionResultSchema, result)) {
      throw new ComputerUseError(
        "INVALID_HELPER_RESPONSE",
        "computer-use helper 返回了无效动作结果",
      );
    }
    return result;
  }

  public close(): void {
    const child = this.child;
    this.child = null;
    if (child !== null && child.exitCode === null) child.kill("SIGTERM");
    this.stop(new Error("computer-use client 已关闭"));
  }

  private async request(
    method: ComputerUseRequest["method"],
    params: unknown,
    signal?: AbortSignal,
  ) {
    if (signal?.aborted === true) throw signal.reason;
    if (this.child === null) {
      if (method === "ping") throw new Error("computer-use helper 尚未启动");
      await this.start(signal);
    }
    const child = this.child;
    if (child === null) throw new Error("computer-use helper 启动失败");

    const id = randomUUID();
    const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return new Promise<unknown>((resolve, reject) => {
      const onAbort = () =>
        this.stop(
          signal?.reason instanceof Error ? signal.reason : new Error("computer-use 操作已中止"),
        );
      const timeout = setTimeout(
        () => this.stop(new ComputerUseError("HELPER_TIMEOUT", "computer-use helper 响应超时")),
        timeoutMs,
      );
      const cleanup = () => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
      };
      const finish = (callback: () => void) => {
        if (!this.pending.delete(id)) return;
        cleanup();
        callback();
      };
      this.pending.set(id, { cleanup, reject, resolve });
      signal?.addEventListener("abort", onAbort, { once: true });
      const request: ComputerUseRequest = { id, method, params };
      child.stdin.write(`${JSON.stringify(request)}\n`, (error) => {
        if (error !== null && error !== undefined) finish(() => reject(error));
      });
    });
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    if (Buffer.byteLength(this.buffer) > MAX_RESPONSE_BYTES) {
      this.stop(
        new ComputerUseError("HELPER_RESPONSE_TOO_LARGE", "computer-use helper 响应超过限制"),
      );
      return;
    }
    for (;;) {
      const newline = this.buffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      if (!line.trim()) continue;
      this.consumeLine(line);
    }
  }

  private consumeLine(line: string): void {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      this.stop(
        new ComputerUseError("INVALID_HELPER_RESPONSE", "computer-use helper 返回了无效 JSON"),
      );
      return;
    }
    if (!Value.Check(ComputerUseResponseSchema, value)) {
      this.stop(
        new ComputerUseError("INVALID_HELPER_RESPONSE", "computer-use helper 返回了无效响应"),
      );
      return;
    }
    const pending = this.pending.get(value.id);
    if (pending === undefined) return;
    this.pending.delete(value.id);
    pending.cleanup();
    if (value.ok) pending.resolve(value.result);
    else pending.reject(new ComputerUseError(value.error.code, value.error.message));
  }

  private stop(error: Error): void {
    const child = this.child;
    this.child = null;
    if (child !== null && child.exitCode === null) child.kill("SIGTERM");
    for (const pending of this.pending.values()) {
      pending.cleanup();
      pending.reject(error);
    }
    this.pending.clear();
    this.buffer = "";
  }
}
