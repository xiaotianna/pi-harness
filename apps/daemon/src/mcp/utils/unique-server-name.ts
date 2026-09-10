import { MCP_SERVER_NAME_MAX_LENGTH } from "../../schemas/mcp.js";
import { normalizeMcpName } from "./server-config.js";

export function reserveUniqueMcpName(name: string, occupiedNames: Set<string>): string {
  const normalized = normalizeMcpName(name);
  let suffix = 1;
  let candidate = normalized;
  while (occupiedNames.has(candidate)) {
    suffix += 1;
    const ending = `-${suffix}`;
    candidate = `${normalized.slice(0, MCP_SERVER_NAME_MAX_LENGTH - ending.length)}${ending}`;
  }
  occupiedNames.add(candidate);
  return candidate;
}
