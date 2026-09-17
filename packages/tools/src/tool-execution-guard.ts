import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { TSchema } from "typebox";
import { createToolFingerprint } from "./utils/tool-fingerprint.js";

const MAX_PARALLEL_TOOL_CALLS = 4;

/**
 * 防止副作用工具在单次 Run 中重复执行，保证：
 *  - 同一个工具调用只执行一次。
    - 相同写入反复出现时阻止并提示。
    - 工具超时能够真正停止。
    - 停止 Run 时，正在执行的工具也一起取消。
    - 错误统一显示为“超时、重复调用、路径越界”等明确原因。
 */
export class ToolExecutionGuard {
  private static readonly fileTails = new Map<string, Promise<void>>();
  private activeToolCalls = 0;
  private readonly approvedToolCallIds = new Set<string>();
  private readonly fingerprints = new Set<string>();
  private readonly waiters: Array<() => void> = [];

  public guard<TParameters extends TSchema, TDetails>(
    tool: AgentTool<TParameters, TDetails>,
    timeoutMs: number,
    executionKey?: (params: unknown, signal: AbortSignal) => Promise<string | undefined>,
    beforeExecute?: (toolCallId: string, params: unknown, signal: AbortSignal) => Promise<void>,
    afterExecute?: (toolCallId: string, params: unknown, signal: AbortSignal) => Promise<void>,
  ): AgentTool<TParameters, TDetails> {
    return {
      ...tool,
      execute: (toolCallId, params, signal, onUpdate) =>
        this.execute(
          tool.name,
          timeoutMs,
          signal,
          (executionSignal) =>
            executionKey?.(params, executionSignal) ?? Promise.resolve(undefined),
          async (executionSignal) => {
            await beforeExecute?.(toolCallId, params, executionSignal);
            const result = await tool.execute(toolCallId, params, executionSignal, onUpdate);
            await afterExecute?.(toolCallId, params, executionSignal);
            return result;
          },
        ),
    };
  }

  public createFingerprint(
    toolName: string,
    argumentsValue: unknown,
    workspaceFingerprint: string,
  ): string {
    return createToolFingerprint([toolName, argumentsValue, workspaceFingerprint]);
  }

  public getBlockReason(
    toolCallId: string,
    fingerprint: string,
    allowRepeatedFingerprint = false,
  ): string | null {
    if (this.approvedToolCallIds.has(toolCallId)) {
      return "TOOL_DUPLICATE: 已阻止重复执行同一工具调用";
    }
    if (!allowRepeatedFingerprint && this.fingerprints.has(fingerprint)) {
      return "TOOL_LOOP_DETECTED: 已阻止重复的副作用工具调用";
    }
    return null;
  }

  public recordApproved(toolCallId: string, fingerprint: string): void {
    this.approvedToolCallIds.add(toolCallId);
    this.fingerprints.add(fingerprint);
  }

  /** 执行保护只在单次 Run 内生效，新 Run 可以再次执行相同操作。 */
  public reset(): void {
    this.approvedToolCallIds.clear();
    this.fingerprints.clear();
  }

  private async acquire(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (this.activeToolCalls < MAX_PARALLEL_TOOL_CALLS) {
      this.activeToolCalls += 1;
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const waiter = () => {
        signal.removeEventListener("abort", abort);
        this.activeToolCalls += 1;
        resolve();
      };
      const abort = () => {
        const index = this.waiters.indexOf(waiter);
        if (index !== -1) this.waiters.splice(index, 1);
        reject(signal.reason);
      };
      this.waiters.push(waiter);
      signal.addEventListener("abort", abort, { once: true });
    });
  }

  private async execute<T>(
    toolName: string,
    timeoutMs: number,
    signal: AbortSignal | undefined,
    executionKey: (signal: AbortSignal) => Promise<string | undefined>,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const executionSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    let acquired = false;

    try {
      await this.acquire(executionSignal);
      acquired = true;
      const key = await executionKey(executionSignal);
      if (key === undefined) return await operation(executionSignal);
      const previous = ToolExecutionGuard.fileTails.get(key) ?? Promise.resolve();
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      // 已取消的等待者也要留在队列中，直到前一个操作退出。
      const tail = previous
        .then(() => gate)
        .then(() => {
          if (ToolExecutionGuard.fileTails.get(key) === tail)
            ToolExecutionGuard.fileTails.delete(key);
        });
      ToolExecutionGuard.fileTails.set(key, tail);
      try {
        await new Promise<void>((resolve, reject) => {
          const abort = () => reject(executionSignal.reason);
          if (executionSignal.aborted) return abort();
          executionSignal.addEventListener("abort", abort, { once: true });
          previous
            .then(resolve, reject)
            .finally(() => executionSignal.removeEventListener("abort", abort));
        });
        executionSignal.throwIfAborted();
        return await operation(executionSignal);
      } finally {
        release();
      }
    } catch (error: unknown) {
      if (timeoutSignal.aborted) {
        throw new Error(`TOOL_TIMEOUT: ${toolName} 执行超过 ${timeoutMs}ms`);
      }
      if (signal?.aborted) throw new Error(`TOOL_ABORTED: ${toolName} 已取消`);
      throw error;
    } finally {
      if (acquired) {
        this.activeToolCalls -= 1;
        this.waiters.shift()?.();
      }
    }
  }
}
