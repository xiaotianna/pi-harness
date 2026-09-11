import type { Client, Transport } from "@modelcontextprotocol/client";
import { McpConnectionStatus, type McpServerRecord } from "../schemas/mcp.js";
import { createMcpClient } from "./client.js";
import type { McpCredential } from "./credential.js";
import { McpError, McpErrorCode } from "./errors.js";
import { maintainMcpListSubscription } from "./list-subscription.js";

const MAX_CLIENT_INSTANCES = 32;
const CONNECT_TIMEOUT_MS = 30_000;

export interface McpConnectionContext {
  ownerId: string;
  workspaceRoot: string;
  server: McpServerRecord;
  credential?: McpCredential;
}

export interface McpClientLease {
  client: Client;
  signal: AbortSignal;
  readonly catalogGeneration: number;
  release(): void;
}

export type McpTransportFactory = (
  context: McpConnectionContext,
  signal: AbortSignal,
) => Promise<Transport>;

interface ClientEntry {
  context: McpConnectionContext;
  client: Client;
  controller: AbortController;
  ready: Promise<void>;
  closing?: Promise<void>;
  leases: number;
  catalogGeneration: number;
  invalidateCatalog(): void;
  subscriptionTask?: Promise<void>;
  status:
    | typeof McpConnectionStatus.CONNECTING
    | typeof McpConnectionStatus.READY
    | typeof McpConnectionStatus.CLOSING;
}

/** 连接与请求分开取消；一个 Session 释放租约不会关闭其他 Session 的 Client。 */
export class McpClientManager {
  private readonly entries = new Map<string, ClientEntry>();
  private isClosed = false;

  public constructor(
    private readonly createTransport: McpTransportFactory,
    private readonly onCloseError: (error: McpError) => void,
    private readonly verifyContext: (context: McpConnectionContext) => void,
  ) {}

  public async acquire(
    context: McpConnectionContext,
    signal: AbortSignal,
  ): Promise<McpClientLease> {
    signal.throwIfAborted();
    this.verifyContext(context);
    if (this.isClosed) {
      throw new McpError(McpErrorCode.DISABLED, "MCP 连接管理器已关闭");
    }
    const key = JSON.stringify([
      context.ownerId,
      context.workspaceRoot,
      context.server.id,
      context.server.revision,
      context.credential?.identity ?? null,
      context.credential?.revision ?? null,
    ]);
    let entry = this.entries.get(key);
    if (entry?.closing !== undefined) {
      throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 连接正在关闭，请稍后重试");
    }
    if (entry === undefined) {
      if (this.entries.size >= MAX_CLIENT_INSTANCES) {
        const idleEntry = [...this.entries].find(
          ([, candidate]) => candidate.leases === 0 && candidate.closing === undefined,
        );
        if (idleEntry === undefined)
          throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 活动连接数量达到上限");
        await this.closeEntry(idleEntry[0], idleEntry[1]);
      }
      let generation = 0;
      const client = createMcpClient(() => {
        generation += 1;
      });
      const controller = new AbortController();
      entry = {
        context,
        client,
        controller,
        leases: 0,
        get catalogGeneration() {
          return generation;
        },
        invalidateCatalog() {
          generation += 1;
        },
        ready: Promise.resolve(),
        status: McpConnectionStatus.CONNECTING,
      };
      this.entries.set(key, entry);
      const capturedEntry = entry;
      entry.ready = this.connect(entry).catch(async (error: unknown) => {
        controller.abort();
        try {
          await client.close();
        } finally {
          // factory 可能在 transport 交给 SDK 前失败，此时 SDK 不会触发 onclose。
          if (this.entries.get(key) === capturedEntry) this.entries.delete(key);
        }
        if (error instanceof McpError) throw error;
        throw new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 连接失败，请检查配置与服务状态");
      });
      client.onclose = () => {
        controller.abort();
        if (this.entries.get(key) === capturedEntry) this.entries.delete(key);
      };
      client.onerror = () => {
        // SDK 的 onerror 也用于报告非致命协议异常；连接关闭由 onclose 统一回收。
        this.onCloseError(new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 协议出现非致命错误"));
      };
    }
    entry.leases += 1;
    try {
      await this.waitForReady(entry.ready, signal);
      signal.throwIfAborted();
      entry.controller.signal.throwIfAborted();
      this.verifyContext(context);
    } catch (error: unknown) {
      this.release(key, entry);
      throw error;
    }
    let isReleased = false;
    const capturedEntry = entry;
    return {
      client: entry.client,
      signal: entry.controller.signal,
      get catalogGeneration() {
        return capturedEntry.catalogGeneration;
      },
      release: () => {
        if (isReleased) return;
        isReleased = true;
        this.release(key, capturedEntry);
      },
    };
  }

  public async invalidateServer(serverId: string): Promise<void> {
    const entries = [...this.entries].filter(([, entry]) => entry.context.server.id === serverId);
    await Promise.all(entries.map(([key, entry]) => this.closeEntry(key, entry)));
  }

  public async invalidateOwner(ownerId: string): Promise<void> {
    const entries = [...this.entries].filter(([, entry]) => entry.context.ownerId === ownerId);
    await Promise.all(entries.map(([key, entry]) => this.closeEntry(key, entry)));
  }

  public async invalidateAll(): Promise<void> {
    await Promise.all([...this.entries].map(([key, entry]) => this.closeEntry(key, entry)));
  }

  public async close(): Promise<void> {
    this.isClosed = true;
    await Promise.all([...this.entries].map(([key, entry]) => this.closeEntry(key, entry)));
  }

  private async connect(entry: ClientEntry): Promise<void> {
    const signal = AbortSignal.any([
      entry.controller.signal,
      AbortSignal.timeout(CONNECT_TIMEOUT_MS),
    ]);
    const transport = await this.createTransport(entry.context, signal);
    if (signal.aborted) {
      await transport.close();
      signal.throwIfAborted();
    }
    try {
      this.verifyContext(entry.context);
      await entry.client.connect(transport, { signal, timeout: CONNECT_TIMEOUT_MS });
      signal.throwIfAborted();
      entry.status = McpConnectionStatus.READY;
      const subscription = entry.client.autoOpenedSubscription;
      if (subscription !== undefined) {
        entry.subscriptionTask = maintainMcpListSubscription(
          entry.client,
          subscription,
          entry.controller.signal,
          entry.invalidateCatalog,
          this.onCloseError,
        );
      }
    } catch (error: unknown) {
      await transport.close();
      throw error;
    }
  }

  private release(key: string, entry: ClientEntry): void {
    entry.leases -= 1;
    if (entry.leases > 0 || entry.closing !== undefined || entry.controller.signal.aborted) return;
    if (entry.status === McpConnectionStatus.CONNECTING) {
      void this.closeEntry(key, entry).catch(() => {
        this.onCloseError(new McpError(McpErrorCode.CONNECTION_FAILED, "取消 MCP 连接准备失败"));
      });
      return;
    }
  }

  private closeEntry(key: string, entry: ClientEntry): Promise<void> {
    if (entry.closing !== undefined) return entry.closing;
    entry.controller.abort();
    entry.status = McpConnectionStatus.CLOSING;
    entry.closing = (async () => {
      try {
        await entry.client.close();
        await entry.subscriptionTask;
        // factory 收到同一中止信号；等待迟到的 transport 释放，避免关闭后再次连接。
        await entry.ready.catch(() => undefined);
        await entry.client.close();
      } finally {
        if (this.entries.get(key) === entry) this.entries.delete(key);
      }
    })();
    return entry.closing;
  }

  private async waitForReady(ready: Promise<void>, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const aborted = () => reject(signal.reason);
      signal.addEventListener("abort", aborted, { once: true });
      ready.then(
        () => {
          signal.removeEventListener("abort", aborted);
          resolve();
        },
        (error: unknown) => {
          signal.removeEventListener("abort", aborted);
          reject(error);
        },
      );
    });
  }
}
