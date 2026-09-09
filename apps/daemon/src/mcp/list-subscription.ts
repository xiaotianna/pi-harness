import { setTimeout as delay } from "node:timers/promises";
import type { Client, McpSubscription } from "@modelcontextprotocol/client";
import { McpError, McpErrorCode } from "./errors.js";

/** SDK 不会自动重建 modern listen；仅重建目录订阅，不重放工具调用。 */
export async function maintainMcpListSubscription(
  client: Client,
  initial: McpSubscription,
  signal: AbortSignal,
  invalidate: () => void,
  reportError: (error: McpError) => void,
): Promise<void> {
  let subscription = initial;
  let attempts = 0;
  let openedAt = performance.now();
  while (!signal.aborted) {
    const reason = await subscription.closed;
    if (signal.aborted || reason === "local") return;
    invalidate();
    if (reason === "graceful") return;
    if (performance.now() - openedAt >= 30_000) attempts = 0;
    if (attempts >= 3) {
      reportError(new McpError(McpErrorCode.CONNECTION_FAILED, "MCP 目录订阅连续重连次数达到上限"));
      return;
    }
    try {
      await delay(1_000 * 2 ** attempts, undefined, { signal });
      attempts += 1;
      subscription = await client.listen(subscription.honoredFilter, { signal, timeout: 5_000 });
      openedAt = performance.now();
    } catch {
      if (!signal.aborted)
        reportError(
          new McpError(
            McpErrorCode.CONNECTION_FAILED,
            "MCP 目录订阅恢复失败，将在下次发现时重新读取",
          ),
        );
      return;
    }
  }
}
