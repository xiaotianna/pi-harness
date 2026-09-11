import { constants } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { McpAuthMode, McpTransport } from "../../schemas/mcp.js";
import type { McpConnectionContext } from "../client-manager.js";
import { McpError, McpErrorCode } from "../errors.js";
import type { McpProcessLaunch } from "../transports/stdio.js";
import { validateMcpCredential } from "./credential.js";

/** 固定搜索路径不读取 daemon PATH；不允许项目内的同名程序劫持启动命令。 */
const MCP_EXECUTABLE_DIRECTORIES = [
  dirname(process.execPath),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
];

export async function prepareMcpProcessLaunch(
  context: McpConnectionContext,
  signal: AbortSignal,
): Promise<McpProcessLaunch> {
  signal.throwIfAborted();
  const config = context.server.config;
  if (config.transport !== McpTransport.STDIO)
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 本地进程配置无效");
  const credential =
    context.credential === undefined ? undefined : validateMcpCredential(context.credential);
  if (credential !== undefined && credential.material.mode !== McpAuthMode.STATIC) {
    throw new McpError(McpErrorCode.CREDENTIAL_INVALID, "stdio 服务仅支持环境变量凭据");
  }
  let cwd: string;
  let command: string | undefined;
  try {
    cwd = await realpath(context.workspaceRoot);
    if (cwd !== resolve(context.workspaceRoot)) throw new Error("workspace identity changed");
    if (!(await stat(cwd)).isDirectory()) throw new Error("invalid workspace");
    const candidates = isAbsolute(config.command)
      ? [config.command]
      : config.command.includes("/")
        ? []
        : MCP_EXECUTABLE_DIRECTORIES.map((path) => join(path, config.command));
    for (const candidate of candidates) {
      try {
        const resolved = await realpath(candidate);
        await access(resolved, constants.X_OK);
        if ((await stat(resolved)).isFile()) {
          command = resolved;
          break;
        }
      } catch (error: unknown) {
        // 搜索路径中的缺失或不可执行项可跳过，其余配置在下方统一失败。
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            ["ENOENT", "EACCES", "ENOTDIR"].includes(String(error.code))
          )
        )
          throw error;
      }
    }
  } catch {
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 工作区或启动程序不可访问");
  }
  if (command === undefined)
    throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 启动程序不存在或不可执行，请使用绝对路径");
  signal.throwIfAborted();
  return {
    commandId: `mcp:${context.server.id}:${context.ownerId}`,
    command,
    args: [...config.args],
    cwd,
    environment: {
      PATH: MCP_EXECUTABLE_DIRECTORIES.join(delimiter),
      LANG: "en_US.UTF-8",
    },
    credentials:
      credential?.material.mode === McpAuthMode.STATIC ? credential.material.environment : {},
  };
}
