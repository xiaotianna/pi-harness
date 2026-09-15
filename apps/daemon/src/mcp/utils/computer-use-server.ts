import { COMPUTER_USE_HELPER_COMMAND } from "@pi-harness/computer-use";
import { type McpServerRecord, McpTransport } from "../../schemas/mcp.js";

export const COMPUTER_USE_MCP_SERVER_NAME = "__pi_plugin_app__:computer-use:computer-use";

export function isComputerUseMcpServer(server: Pick<McpServerRecord, "config" | "name">): boolean {
  return (
    server.name === COMPUTER_USE_MCP_SERVER_NAME &&
    server.config.transport === McpTransport.STDIO &&
    server.config.command === COMPUTER_USE_HELPER_COMMAND &&
    server.config.args.length === 1 &&
    server.config.args[0] === "--mcp"
  );
}
