import { randomUUID } from "node:crypto";
import type { CreateMcpServerDto } from "../../dto/mcp-dto.js";
import type { McpServerRecord } from "../../schemas/mcp.js";
import { normalizeMcpConfig, normalizeMcpName } from "./server-config.js";

export function createMcpServerRecord(input: CreateMcpServerDto): McpServerRecord {
  const now = Date.now();
  return {
    id: randomUUID(),
    name: normalizeMcpName(input.name),
    config: normalizeMcpConfig(input.config),
    enabled: false,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };
}
