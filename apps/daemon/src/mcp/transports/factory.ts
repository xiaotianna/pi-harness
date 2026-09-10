import {
  type AuthProvider,
  SSEClientTransport,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { McpAuthMode, McpTransport } from "../../schemas/mcp.js";
import type { McpConnectionContext, McpTransportFactory } from "../client-manager.js";
import { McpError, McpErrorCode } from "../errors.js";
import { prepareMcpProcessLaunch } from "../utils/process-launch.js";
import { createMcpHttpFetch } from "./http-fetch.js";
import { McpStdioTransport } from "./stdio.js";

export function createMcpTransportFactory(
  verifyContext: (context: McpConnectionContext) => void,
  createAuthProvider: (context: McpConnectionContext) => AuthProvider,
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
    if (config.authMode === McpAuthMode.STATIC && material?.mode !== McpAuthMode.STATIC) {
      throw new McpError(
        McpErrorCode.STATIC_CREDENTIAL_REQUIRED,
        "该 MCP 服务需要 Token 或 API Key，请设置请求头凭据",
      );
    }
    if (config.authMode === McpAuthMode.OAUTH && material?.mode !== McpAuthMode.OAUTH) {
      throw new McpError(McpErrorCode.OAUTH_REQUIRED, "该 MCP 服务需要 OAuth 授权");
    }
    if (material?.mode === McpAuthMode.STATIC) {
      headers = material.headers;
    } else if (material?.mode === McpAuthMode.OAUTH && material.resource !== config.url) {
      throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP OAuth 授权目标不匹配");
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
    const authProvider = createAuthProvider(context);
    if (config.transport === McpTransport.SSE)
      return new SSEClientTransport(new URL(config.url), { authProvider, fetch });
    return new StreamableHTTPClientTransport(new URL(config.url), {
      authProvider,
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
