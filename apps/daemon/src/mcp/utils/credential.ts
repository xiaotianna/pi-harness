import { Value } from "typebox/value";
import { McpAuthMode } from "../../schemas/mcp.js";
import { type McpCredential, McpCredentialSchema } from "../credential.js";
import { McpError, McpErrorCode } from "../errors.js";

const PROTECTED_HEADERS = new Set([
  "host",
  "origin",
  "connection",
  "content-length",
  "content-type",
  "transfer-encoding",
  "accept",
  "cookie",
  "proxy-authorization",
  "upgrade",
]);
const PROTECTED_ENVIRONMENT = new Set([
  "PATH",
  "HOME",
  "SHELL",
  "TMPDIR",
  "ENV",
  "BASH_ENV",
  "ZDOTDIR",
  "PYTHONPATH",
  "PYTHONHOME",
]);

export function validateMcpCredential(input: unknown): McpCredential {
  if (!Value.Check(McpCredentialSchema, input)) {
    throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP 凭据结构无效");
  }
  if (input.material.mode === McpAuthMode.STATIC) {
    const headers = new Set<string>();
    for (const name of Object.keys(input.material.headers)) {
      const normalized = name.toLowerCase();
      if (
        PROTECTED_HEADERS.has(normalized) ||
        normalized.startsWith("mcp-") ||
        normalized.startsWith("sec-") ||
        headers.has(normalized)
      ) {
        throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP 凭据含保留或重复请求头");
      }
      headers.add(normalized);
    }
    for (const name of Object.keys(input.material.environment)) {
      const normalized = name.toUpperCase();
      if (
        PROTECTED_ENVIRONMENT.has(normalized) ||
        /^(NODE_|LD_|DYLD_|GIT_CONFIG|NPM_CONFIG|PI_HARNESS_)/u.test(normalized)
      ) {
        throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP 凭据不能覆盖进程控制环境变量");
      }
    }
  } else {
    for (const value of [input.material.issuer, input.material.resource]) {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "MCP OAuth 凭据来源无效");
      }
      if (url.protocol !== "https:" || url.username || url.password || url.hash) {
        throw new McpError(
          McpErrorCode.CREDENTIAL_INVALID,
          "MCP OAuth 凭据须绑定有效的 HTTPS 来源",
        );
      }
    }
  }
  return structuredClone(input);
}
