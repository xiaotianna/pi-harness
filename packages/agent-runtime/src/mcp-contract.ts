// Browser-safe MCP configuration discriminants; no SDK or daemon dependencies.
export const McpTransport = {
  STDIO: "stdio",
  STREAMABLE_HTTP: "streamable_http",
  SSE: "sse",
} as const;

export const McpJsonTransport = {
  STDIO: "stdio",
  HTTP: "http",
  SSE: "sse",
} as const;

export const McpIsolationMode = {
  ISOLATED: "isolated",
  TRUSTED: "trusted",
} as const;

export const McpAuthMode = {
  NONE: "none",
  STATIC: "static",
  OAUTH: "oauth",
} as const;

export const McpAuthRequirement = {
  UNKNOWN: "unknown",
  NONE: "none",
  STATIC: "static",
  OAUTH: "oauth",
} as const;

export type McpAuthRequirement = (typeof McpAuthRequirement)[keyof typeof McpAuthRequirement];

export const McpConnectionStatus = {
  DISABLED: "disabled",
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  READY: "ready",
  RECONNECTING: "reconnecting",
  AUTH_REQUIRED: "auth_required",
  ERROR: "error",
  CLOSING: "closing",
} as const;

export type McpConnectionStatus = (typeof McpConnectionStatus)[keyof typeof McpConnectionStatus];
