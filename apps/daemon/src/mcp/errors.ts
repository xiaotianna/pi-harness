export const McpErrorCode = {
  INVALID_CONFIG: "MCP_INVALID_CONFIG",
  NOT_FOUND: "MCP_NOT_FOUND",
  CONFIG_CONFLICT: "MCP_CONFIG_CONFLICT",
  STORAGE_FAILED: "MCP_STORAGE_FAILED",
  CREDENTIAL_INVALID: "MCP_CREDENTIAL_INVALID",
  STATIC_CREDENTIAL_REQUIRED: "MCP_STATIC_CREDENTIAL_REQUIRED",
  OAUTH_REQUIRED: "MCP_OAUTH_REQUIRED",
  OAUTH_FAILED: "MCP_OAUTH_FAILED",
  TRUST_REQUIRED: "MCP_TRUST_REQUIRED",
  DISABLED: "MCP_DISABLED",
  CONNECTION_FAILED: "MCP_CONNECTION_FAILED",
  CAPABILITY_UNAVAILABLE: "MCP_CAPABILITY_UNAVAILABLE",
  LIMIT_EXCEEDED: "MCP_LIMIT_EXCEEDED",
} as const;

export type McpErrorCode = (typeof McpErrorCode)[keyof typeof McpErrorCode];

/** message 只能由 Host 提供，不携带远端错误、凭据或文件路径。 */
export class McpError extends Error {
  public constructor(
    public readonly code: McpErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "McpError";
  }
}

export const MCP_ERROR_STATUS: Record<McpErrorCode, number> = {
  [McpErrorCode.INVALID_CONFIG]: 400,
  [McpErrorCode.NOT_FOUND]: 404,
  [McpErrorCode.CONFIG_CONFLICT]: 409,
  [McpErrorCode.STORAGE_FAILED]: 500,
  [McpErrorCode.CREDENTIAL_INVALID]: 400,
  [McpErrorCode.STATIC_CREDENTIAL_REQUIRED]: 401,
  [McpErrorCode.OAUTH_REQUIRED]: 401,
  [McpErrorCode.OAUTH_FAILED]: 400,
  [McpErrorCode.TRUST_REQUIRED]: 403,
  [McpErrorCode.DISABLED]: 409,
  [McpErrorCode.CONNECTION_FAILED]: 502,
  [McpErrorCode.CAPABILITY_UNAVAILABLE]: 422,
  [McpErrorCode.LIMIT_EXCEEDED]: 429,
};
