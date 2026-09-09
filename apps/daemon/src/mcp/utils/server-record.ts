import { Value } from "typebox/value";
import { type McpServerRecord, McpServerRecordSchema } from "../../schemas/mcp.js";
import { McpError, McpErrorCode } from "../errors.js";
import { normalizeMcpConfig } from "./server-config.js";

export function mapMcpServerRecord(row: Record<string, unknown>): McpServerRecord {
  try {
    if (typeof row.config_json !== "string" || (row.enabled !== 0 && row.enabled !== 1)) {
      throw new Error("Invalid stored MCP record");
    }
    const candidate = {
      id: row.id,
      name: row.name,
      config: normalizeMcpConfig(JSON.parse(row.config_json) as unknown),
      enabled: row.enabled === 1,
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    if (!Value.Check(McpServerRecordSchema, candidate)) {
      throw new Error("Invalid stored MCP record");
    }
    return candidate;
  } catch {
    throw new McpError(McpErrorCode.STORAGE_FAILED, "保存的 MCP 配置无效，请检查配置存储");
  }
}
