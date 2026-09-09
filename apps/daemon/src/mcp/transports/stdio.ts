import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  type JSONRPCMessage,
  serializeMessage,
  type Transport,
} from "@modelcontextprotocol/client";
import { McpError, McpErrorCode } from "../errors.js";
import { McpStdioMessageBuffer } from "../utils/stdio-message-buffer.js";

const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;
const MAX_PENDING_BYTES = 8 * 1024 * 1024;
const MAX_STDERR_BYTES = 1024 * 1024;
const MAX_BYTES_PER_SECOND = 16 * 1024 * 1024;
const MAX_MESSAGES_PER_SECOND = 1_024;
const WRITE_TIMEOUT_MS = 15_000;
const TERMINATE_GRACE_MS = 500;
const KILL_TIMEOUT_MS = 1_500;

export interface McpProcessLaunch {
  command: string;
  args: readonly string[];
  cwd: string;
  environment: Readonly<Record<string, string>>;
}

/** 使用 SDK 的协议解析器；Host 独立控制环境、进程组和有界 I/O。 */
export class McpStdioTransport implements Transport {
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;

  private child: ChildProcessWithoutNullStreams | undefined;
  private readonly buffer = new McpStdioMessageBuffer(MAX_MESSAGE_BYTES);
  private closing: Promise<void> | undefined;
  private isStarted = false;
  private isClosed = false;
  private pendingBytes = 0;
  private stderrBytes = 0;
  private windowStartedAt = performance.now();
  private windowBytes = 0;
  private windowMessages = 0;

  public constructor(
    private readonly launch: McpProcessLaunch,
    private readonly verifyBeforeSpawn: () => void,
    private readonly dispose: () => Promise<void>,
  ) {}

  public async start(): Promise<void> {
    if (this.isStarted || this.isClosed) {
      throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 进程不可重复启动");
    }
    // Windows 需要 Job Object 才能保证进程树回收，未实现前拒绝启动。
    if (process.platform === "win32") {
      throw new McpError(McpErrorCode.CAPABILITY_UNAVAILABLE, "当前平台尚不支持受控 MCP 本地进程");
    }
    this.verifyBeforeSpawn();
    this.isStarted = true;
    const child = spawn(this.launch.command, [...this.launch.args], {
      cwd: this.launch.cwd,
      env: { ...this.launch.environment },
      shell: false,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;
    child.stdout.on("data", (chunk: Buffer) => this.receive(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      // stderr 可能含服务器凭据或文件内容，只统计大小，不输出原文。
      this.stderrBytes += chunk.byteLength;
      if (this.stderrBytes > MAX_STDERR_BYTES)
        this.fail(McpErrorCode.LIMIT_EXCEEDED, "MCP stderr 超过输出限额");
    });
    for (const stream of [child.stdin, child.stdout, child.stderr]) {
      stream.on("error", () => this.fail(McpErrorCode.CONNECTION_FAILED, "MCP 进程通信失败"));
    }
    child.once("exit", () => {
      // 父进程退出后仍可能有子进程持有管道，继续收敛整个进程组。
      void this.close().catch(() =>
        this.onerror?.(new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 进程回收失败")),
      );
    });
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", () => {
        const error = new McpError(
          McpErrorCode.CONNECTION_FAILED,
          "无法启动 MCP 进程，请检查命令与执行权限",
        );
        reject(error);
        this.fail(error.code, error.message);
      });
    });
  }

  public async send(message: JSONRPCMessage): Promise<void> {
    const child = this.child;
    if (child === undefined || this.isClosed)
      throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 进程未连接");
    const serialized = serializeMessage(message);
    const bytes = Buffer.byteLength(serialized);
    if (bytes > MAX_MESSAGE_BYTES || this.pendingBytes + bytes > MAX_PENDING_BYTES) {
      throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 待发送数据超过限额");
    }
    this.pendingBytes += bytes;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 进程写入超时"));
          this.fail(McpErrorCode.CONNECTION_FAILED, "MCP 进程写入超时");
        }, WRITE_TIMEOUT_MS);
        child.stdin.write(serialized, (error) => {
          clearTimeout(timer);
          if (error) reject(new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 进程写入失败"));
          else resolve();
        });
      });
    } finally {
      this.pendingBytes -= bytes;
    }
  }

  public close(): Promise<void> {
    if (this.closing !== undefined) return this.closing;
    this.isClosed = true;
    this.closing = Promise.resolve().then(async () => {
      const child = this.child;
      try {
        if (child?.pid !== undefined) {
          this.signalGroup(child.pid, "SIGTERM");
          await delay(TERMINATE_GRACE_MS);
          this.signalGroup(child.pid, "SIGKILL");
          if (child.exitCode === null && child.signalCode === null) {
            const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
            const timeout = new AbortController();
            try {
              await Promise.race([
                exited,
                delay(KILL_TIMEOUT_MS, undefined, { signal: timeout.signal }).then(() => {
                  throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 进程未在期限内退出");
                }),
              ]);
            } finally {
              timeout.abort();
            }
          }
        }
      } finally {
        child?.stdin.destroy();
        child?.stdout.destroy();
        child?.stderr.destroy();
        this.child = undefined;
        this.buffer.clear();
        try {
          await this.dispose();
        } finally {
          this.onclose?.();
        }
      }
    });
    return this.closing;
  }

  private signalGroup(pid: number, signal: NodeJS.Signals): void {
    try {
      process.kill(-pid, signal);
    } catch (error: unknown) {
      if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) {
        throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 进程组终止失败");
      }
    }
  }

  private receive(chunk: Buffer): void {
    if (this.isClosed) return;
    if (performance.now() - this.windowStartedAt >= 1_000) {
      this.windowStartedAt = performance.now();
      this.windowBytes = 0;
      this.windowMessages = 0;
    }
    this.windowBytes += chunk.byteLength;
    if (this.windowBytes > MAX_BYTES_PER_SECOND) {
      this.fail(McpErrorCode.LIMIT_EXCEEDED, "MCP 输出速率超过限额");
      return;
    }
    try {
      this.buffer.append(chunk, (message) => {
        if (this.isClosed) return;
        this.windowMessages += 1;
        if (this.windowMessages > MAX_MESSAGES_PER_SECOND) {
          this.fail(McpErrorCode.LIMIT_EXCEEDED, "MCP 消息速率超过限额");
          return;
        }
        this.onmessage?.(message);
      });
    } catch {
      this.fail(McpErrorCode.CONNECTION_FAILED, "MCP stdout 包含无效协议数据或消息超限");
    }
  }

  private fail(code: McpErrorCode, message: string): void {
    if (this.isClosed) return;
    this.onerror?.(new McpError(code, message));
    void this.close().catch(() =>
      this.onerror?.(new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 进程清理失败")),
    );
  }
}
