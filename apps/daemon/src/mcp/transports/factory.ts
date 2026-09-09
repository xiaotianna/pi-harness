import { SSEClientTransport, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { McpAuthMode, McpTransport } from "../../schemas/mcp.js";
import type { McpConnectionContext, McpTransportFactory } from "../client-manager.js";
import { McpError, McpErrorCode } from "../errors.js";
import { prepareMcpProcessLaunch } from "../utils/process-launch.js";
import { createMcpHttpFetch } from "./http-fetch.js";
import { McpStdioTransport } from "./stdio.js";

export function createMcpTransportFactory(
  verifyContext: (context: McpConnectionContext) => void,
  protectedLocalPorts: readonly number[],
): McpTransportFactory {
  return async (context, signal) => {
    signal.throwIfAborted();
    verifyContext(context);
    if (context.server.config.transport === McpTransport.STDIO) {
      const { launch, dispose } = await prepareMcpProcessLaunch(context, signal);
      return new McpStdioTransport(
        launch,
        () => {
          signal.throwIfAborted();
          verifyContext(context);
        },
        dispose,
      );
    }
    const config = context.server.config;
    const material = context.credential?.material;
    let headers: Readonly<Record<string, string>> = {};
    if (config.authMode !== McpAuthMode.NONE) {
      if (material === undefined || material.mode !== config.authMode) {
        throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "请先为 MCP 服务配置认证");
      }
      if (material.mode === McpAuthMode.STATIC) headers = material.headers;
      else {
        if (
          material.resource !== config.url ||
          (material.expiresAt !== undefined && material.expiresAt <= Date.now())
        ) {
          throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP 授权已过期或目标资源不匹配");
        }
        headers = { Authorization: `Bearer ${material.accessToken}` };
      }
    }
    const fetch = createMcpHttpFetch(
      {
        endpoint: new URL(config.url),
        allowedOrigins: config.allowedOrigins,
        allowPrivateNetwork: config.allowPrivateNetwork,
        protectedLocalPorts,
        timeoutMs: config.requestTimeoutMs,
      },
      headers,
      () => verifyContext(context),
    );
    if (config.transport === McpTransport.SSE)
      return new SSEClientTransport(new URL(config.url), { fetch });
    return new StreamableHTTPClientTransport(new URL(config.url), {
      fetch,
      reconnectionOptions: {
        initialReconnectionDelay: 1_000,
        maxReconnectionDelay: 30_000,
        reconnectionDelayGrowFactor: 1.5,
        maxRetries: 2,
      },
    });
  };
}
