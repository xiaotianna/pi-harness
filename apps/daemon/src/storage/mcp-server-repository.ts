import type { DatabaseSync } from "node:sqlite";
import { Value } from "typebox/value";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { mapMcpServerRecord } from "../mcp/utils/server-record.js";
import { type McpServerId, type McpServerRecord, McpServerRecordSchema } from "../schemas/mcp.js";

export interface McpServerRepository {
  create(record: McpServerRecord): void;
  createMany(records: readonly McpServerRecord[]): void;
  find(serverId: McpServerId): McpServerRecord | null;
  list(): readonly McpServerRecord[];
  update(record: McpServerRecord, expectedRevision: number): void;
  delete(serverId: McpServerId, expectedRevision: number): void;
  isTrusted(serverId: McpServerId, revision: number): boolean;
  listTrustedServerIds(): readonly McpServerId[];
  trust(serverId: McpServerId, expectedRevision: number, approvedAt: number): void;
  revokeTrust(serverId: McpServerId): void;
}

export class SqliteMcpServerRepository implements McpServerRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public createMany(records: readonly McpServerRecord[]): void {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const record of records) this.create(record);
      this.database.exec("COMMIT");
    } catch (error: unknown) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  public create(record: McpServerRecord): void {
    if (!Value.Check(McpServerRecordSchema, record) || record.revision !== 1 || record.enabled) {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "新 MCP 配置必须处于禁用状态且版本为 1");
    }
    this.database
      .prepare(
        `INSERT INTO mcp_servers (id, name, config_json, enabled, revision, created_at, updated_at)
         VALUES (?, ?, ?, 0, 1, ?, ?)`,
      )
      .run(
        record.id,
        record.name,
        JSON.stringify(record.config),
        record.createdAt,
        record.updatedAt,
      );
  }

  public find(serverId: McpServerId): McpServerRecord | null {
    const row = this.database.prepare("SELECT * FROM mcp_servers WHERE id = ?").get(serverId);
    return row === undefined ? null : mapMcpServerRecord(row);
  }

  public list(): readonly McpServerRecord[] {
    return this.database
      .prepare("SELECT * FROM mcp_servers ORDER BY created_at, id")
      .all()
      .map(mapMcpServerRecord);
  }

  public update(record: McpServerRecord, expectedRevision: number): void {
    if (
      !Value.Check(McpServerRecordSchema, record) ||
      !Number.isSafeInteger(expectedRevision) ||
      record.revision !== expectedRevision + 1
    ) {
      throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 配置版本无效");
    }
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const { changes } = this.database
        .prepare(
          `UPDATE mcp_servers SET name = ?, config_json = ?, enabled = ?, revision = ?, updated_at = ?
           WHERE id = ? AND revision = ?`,
        )
        .run(
          record.name,
          JSON.stringify(record.config),
          Number(record.enabled),
          record.revision,
          record.updatedAt,
          record.id,
          expectedRevision,
        );
      if (changes !== 1) {
        throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 配置已变更，请刷新后重试");
      }
      this.revokeTrust(record.id);
      this.database.prepare("DELETE FROM mcp_grants WHERE server_id = ?").run(record.id);
      this.database.exec("COMMIT");
    } catch (error: unknown) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  /** 调用前 service 必须禁用并收敛连接、清理凭据；CAS 防止删除新配置。 */
  public delete(serverId: McpServerId, expectedRevision: number): void {
    const { changes } = this.database
      .prepare("DELETE FROM mcp_servers WHERE id = ? AND revision = ? AND enabled = 0")
      .run(serverId, expectedRevision);
    if (changes !== 1) {
      throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 配置已变更或仍在启用，请刷新后重试");
    }
  }

  public isTrusted(serverId: McpServerId, revision: number): boolean {
    return (
      this.database
        .prepare(
          `SELECT 1 FROM mcp_server_trust trust
           JOIN mcp_servers servers ON servers.id = trust.server_id
           WHERE trust.server_id = ? AND trust.revision = ? AND servers.revision = trust.revision`,
        )
        .get(serverId, revision) !== undefined
    );
  }

  public listTrustedServerIds(): readonly McpServerId[] {
    return this.database
      .prepare(
        `SELECT trust.server_id
         FROM mcp_server_trust trust
         JOIN mcp_servers servers ON servers.id = trust.server_id
         WHERE servers.revision = trust.revision`,
      )
      .all()
      .map((row) => String(row.server_id));
  }

  public trust(serverId: McpServerId, expectedRevision: number, approvedAt: number): void {
    const { changes } = this.database
      .prepare(
        `INSERT INTO mcp_server_trust (server_id, revision, approved_at)
         SELECT id, revision, ? FROM mcp_servers WHERE id = ? AND revision = ?
         ON CONFLICT(server_id) DO UPDATE SET revision = excluded.revision,
         approved_at = excluded.approved_at`,
      )
      .run(approvedAt, serverId, expectedRevision);
    if (changes !== 1) {
      throw new McpError(McpErrorCode.CONFIG_CONFLICT, "MCP 配置已变更，请重新确认连接配置");
    }
  }

  public revokeTrust(serverId: McpServerId): void {
    this.database.prepare("DELETE FROM mcp_server_trust WHERE server_id = ?").run(serverId);
  }
}
