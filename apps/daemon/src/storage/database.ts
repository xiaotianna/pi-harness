import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ApprovalPolicy, type ApprovalPolicyValue, isApprovalPolicy } from "@pi-harness/policy";
import { DATABASE_MIGRATIONS } from "./migrations.js";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
}

export interface GitHubIdentity {
  githubUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
}

export interface AuthSessionRepository {
  createSession(
    identity: GitHubIdentity,
    tokenHash: string,
    createdAt: number,
    expiresAt: number,
  ): AuthUser;
  deleteSession(tokenHash: string): void;
  findSessionUser(tokenHash: string, now: number): AuthUser | null;
}

export interface CustomProviderRecord {
  baseUrl: string;
  createdAt: number;
  enabled: boolean;
  id: string;
  modelIds: readonly string[];
  name: string;
  protocol: string;
  requiresApiKey: boolean;
  updatedAt: number;
}

export interface ProviderSettingRepository {
  createCustom(provider: CustomProviderRecord): void;
  deleteCustom(providerId: string): boolean;
  findCustom(providerId: string): CustomProviderRecord | null;
  listBuiltInEnabled(): ReadonlyMap<string, boolean>;
  listCustom(): readonly CustomProviderRecord[];
  setBuiltInEnabled(providerId: string, enabled: boolean, updatedAt: number): void;
  updateCustom(provider: CustomProviderRecord): boolean;
}

export interface AppSettingRepository {
  getApprovalPolicy(): ApprovalPolicyValue;
  setApprovalPolicy(approvalPolicy: ApprovalPolicyValue, updatedAt: number): void;
}

export interface SessionRecord {
  createdAt: number;
  id: string;
  lastSeq: number;
  modelId: string;
  providerId: string;
  title: string;
  updatedAt: number;
  workspaceId: string;
  workspaceRoot: string;
}

export interface WorkspaceRecord {
  createdAt: number;
  id: string;
  name: string | null;
  removedAt: number | null;
  rootPath: string;
  updatedAt: number;
}

export interface CreateSessionRecord {
  createdAt: number;
  id: string;
  modelId: string;
  providerId: string;
  title: string;
  workspaceId: string;
}

export interface SessionRepository {
  create(session: CreateSessionRecord): SessionRecord;
  find(sessionId: string): SessionRecord | null;
  list(): readonly SessionRecord[];
  setArchived(sessionId: string, archivedAt: number | null, updatedAt: number): boolean;
  updateIndex(sessionId: string, lastSeq: number, updatedAt: number): boolean;
  updateModel(sessionId: string, providerId: string, modelId: string, updatedAt: number): boolean;
  updateTitle(sessionId: string, title: string, updatedAt: number): boolean;
}

export interface WorkspaceRepository {
  create(rootPath: string, createdAt: number): WorkspaceRecord;
  find(workspaceId: string): WorkspaceRecord | null;
  list(): readonly WorkspaceRecord[];
  remove(workspaceId: string, removedAt: number): boolean;
  reorder(workspaceIds: readonly string[], updatedAt: number): void;
  updateName(workspaceId: string, name: string, updatedAt: number): WorkspaceRecord | null;
}

interface DatabaseRow {
  [key: string]: unknown;
}

function readRequiredString(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid database value for ${key}`);
  }
  return value;
}

function readNullableString(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  if (value !== null && typeof value !== "string") {
    throw new Error(`Invalid database value for ${key}`);
  }
  return value;
}

function readRequiredNumber(row: DatabaseRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Invalid database value for ${key}`);
  }
  return value;
}

function readNullableNumber(row: DatabaseRow, key: string): number | null {
  const value = row[key];
  if (value !== null && (typeof value !== "number" || !Number.isSafeInteger(value))) {
    throw new Error(`Invalid database value for ${key}`);
  }
  return value;
}

function mapAuthUser(row: DatabaseRow): AuthUser {
  return {
    id: readRequiredString(row, "id"),
    username: readRequiredString(row, "username"),
    displayName: readNullableString(row, "display_name"),
    avatarUrl: readRequiredString(row, "avatar_url"),
    profileUrl: readRequiredString(row, "profile_url"),
  };
}

function mapCustomProvider(row: DatabaseRow): CustomProviderRecord {
  const modelIds = JSON.parse(readRequiredString(row, "model_ids_json")) as unknown;
  if (!Array.isArray(modelIds) || !modelIds.every((value) => typeof value === "string")) {
    throw new Error("Invalid database value for model_ids_json");
  }

  return {
    baseUrl: readRequiredString(row, "base_url"),
    createdAt: Number(row.created_at),
    enabled: row.enabled === 1,
    id: readRequiredString(row, "provider_id"),
    modelIds,
    name: readRequiredString(row, "name"),
    protocol: readRequiredString(row, "protocol"),
    requiresApiKey: row.requires_api_key === 1,
    updatedAt: Number(row.updated_at),
  };
}

function mapSession(row: DatabaseRow): SessionRecord {
  return {
    createdAt: readRequiredNumber(row, "created_at"),
    id: readRequiredString(row, "id"),
    lastSeq: readRequiredNumber(row, "last_seq"),
    modelId: readRequiredString(row, "model_id"),
    providerId: readRequiredString(row, "provider_id"),
    title: readRequiredString(row, "title"),
    updatedAt: readRequiredNumber(row, "updated_at"),
    workspaceId: readRequiredString(row, "workspace_id"),
    workspaceRoot: readRequiredString(row, "workspace_root"),
  };
}

function mapWorkspace(row: DatabaseRow): WorkspaceRecord {
  return {
    createdAt: readRequiredNumber(row, "created_at"),
    id: readRequiredString(row, "id"),
    name: readNullableString(row, "display_name"),
    removedAt: readNullableNumber(row, "removed_at"),
    rootPath: readRequiredString(row, "root_path"),
    updatedAt: readRequiredNumber(row, "updated_at"),
  };
}

function runMigrations(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    ) STRICT;
  `);

  const hasMigration = database.prepare("SELECT 1 FROM schema_migrations WHERE version = ?");
  const recordMigration = database.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
  );

  for (const migration of DATABASE_MIGRATIONS) {
    if (hasMigration.get(migration.version) !== undefined) {
      continue;
    }

    // migration 与版本记录在同一事务中提交。失败后可在 daemon 下次启动时安全重试，
    // 避免数据库结构停留在只完成一部分的状态。
    database.exec("BEGIN IMMEDIATE");
    try {
      if ("sql" in migration) {
        database.exec(migration.sql);
      } else {
        migration.migrate(database);
      }
      recordMigration.run(migration.version, Date.now());
      database.exec("COMMIT");
    } catch (error: unknown) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}

class SqliteAuthSessionRepository implements AuthSessionRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public createSession(
    identity: GitHubIdentity,
    tokenHash: string,
    createdAt: number,
    expiresAt: number,
  ): AuthUser {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.database
        .prepare("SELECT id FROM auth_users WHERE github_user_id = ?")
        .get(identity.githubUserId) as DatabaseRow | undefined;
      const userId = existing ? readRequiredString(existing, "id") : randomUUID();

      this.database
        .prepare(
          `INSERT INTO auth_users (
             id, github_user_id, username, display_name, avatar_url, profile_url, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(github_user_id) DO UPDATE SET
             username = excluded.username,
             display_name = excluded.display_name,
             avatar_url = excluded.avatar_url,
             profile_url = excluded.profile_url,
             updated_at = excluded.updated_at`,
        )
        .run(
          userId,
          identity.githubUserId,
          identity.username,
          identity.displayName,
          identity.avatarUrl,
          identity.profileUrl,
          createdAt,
          createdAt,
        );

      this.database
        .prepare(
          "INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        )
        .run(tokenHash, userId, createdAt, expiresAt);

      this.database.exec("COMMIT");
      return {
        id: userId,
        username: identity.username,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        profileUrl: identity.profileUrl,
      };
    } catch (error: unknown) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  public deleteSession(tokenHash: string): void {
    this.database.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(tokenHash);
  }

  public findSessionUser(tokenHash: string, now: number): AuthUser | null {
    this.database.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").run(now);
    const row = this.database
      .prepare(
        `SELECT
           users.id,
           users.username,
           users.display_name,
           users.avatar_url,
           users.profile_url
         FROM auth_sessions AS sessions
         INNER JOIN auth_users AS users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
      )
      .get(tokenHash, now) as DatabaseRow | undefined;

    return row ? mapAuthUser(row) : null;
  }
}

class SqliteProviderSettingRepository implements ProviderSettingRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public createCustom(provider: CustomProviderRecord): void {
    this.database
      .prepare(
        `INSERT INTO provider_settings (
           provider_id, kind, name, protocol, base_url, model_ids_json,
           requires_api_key, enabled, created_at, updated_at
         ) VALUES (?, 'custom', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        provider.id,
        provider.name,
        provider.protocol,
        provider.baseUrl,
        JSON.stringify(provider.modelIds),
        Number(provider.requiresApiKey),
        Number(provider.enabled),
        provider.createdAt,
        provider.updatedAt,
      );
  }

  public deleteCustom(providerId: string): boolean {
    return (
      this.database
        .prepare("DELETE FROM provider_settings WHERE provider_id = ? AND kind = 'custom'")
        .run(providerId).changes > 0
    );
  }

  public findCustom(providerId: string): CustomProviderRecord | null {
    const row = this.database
      .prepare("SELECT * FROM provider_settings WHERE provider_id = ? AND kind = 'custom'")
      .get(providerId) as DatabaseRow | undefined;
    return row ? mapCustomProvider(row) : null;
  }

  public listBuiltInEnabled(): ReadonlyMap<string, boolean> {
    const rows = this.database
      .prepare("SELECT provider_id, enabled FROM provider_settings WHERE kind = 'builtin'")
      .all() as DatabaseRow[];
    return new Map(rows.map((row) => [readRequiredString(row, "provider_id"), row.enabled === 1]));
  }

  public listCustom(): readonly CustomProviderRecord[] {
    const rows = this.database
      .prepare("SELECT * FROM provider_settings WHERE kind = 'custom' ORDER BY created_at")
      .all() as DatabaseRow[];
    return rows.map(mapCustomProvider);
  }

  public setBuiltInEnabled(providerId: string, enabled: boolean, updatedAt: number): void {
    this.database
      .prepare(
        `INSERT INTO provider_settings (
           provider_id, kind, model_ids_json, requires_api_key, enabled, created_at, updated_at
         ) VALUES (?, 'builtin', '[]', 1, ?, ?, ?)
         ON CONFLICT(provider_id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
      )
      .run(providerId, Number(enabled), updatedAt, updatedAt);
  }

  public updateCustom(provider: CustomProviderRecord): boolean {
    return (
      this.database
        .prepare(
          `UPDATE provider_settings SET
             name = ?, protocol = ?, base_url = ?, model_ids_json = ?,
             requires_api_key = ?, enabled = ?, updated_at = ?
           WHERE provider_id = ? AND kind = 'custom'`,
        )
        .run(
          provider.name,
          provider.protocol,
          provider.baseUrl,
          JSON.stringify(provider.modelIds),
          Number(provider.requiresApiKey),
          Number(provider.enabled),
          provider.updatedAt,
          provider.id,
        ).changes > 0
    );
  }
}

const APPROVAL_POLICY_KEY = "approval_policy";

class SqliteAppSettingRepository implements AppSettingRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public getApprovalPolicy(): ApprovalPolicyValue {
    const row = this.database
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get(APPROVAL_POLICY_KEY) as DatabaseRow | undefined;
    if (!row) return ApprovalPolicy.REQUEST_APPROVAL;

    const value = readRequiredString(row, "value");
    if (!isApprovalPolicy(value)) {
      throw new Error("Invalid database value for approval policy");
    }
    return value;
  }

  public setApprovalPolicy(approvalPolicy: ApprovalPolicyValue, updatedAt: number): void {
    this.database
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(APPROVAL_POLICY_KEY, approvalPolicy, updatedAt);
  }
}

class SqliteSessionRepository implements SessionRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public create(session: CreateSessionRecord): SessionRecord {
    this.database
      .prepare(
        `INSERT INTO sessions (
           id, workspace_id, provider_id, model_id, title, last_seq,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(
        session.id,
        session.workspaceId,
        session.providerId,
        session.modelId,
        session.title,
        session.createdAt,
        session.createdAt,
      );
    const created = this.find(session.id);
    if (!created) throw new Error("Created session could not be read");
    return created;
  }

  public find(sessionId: string): SessionRecord | null {
    const row = this.database
      .prepare(
        `SELECT sessions.*, workspaces.root_path AS workspace_root
         FROM sessions
         INNER JOIN workspaces ON workspaces.id = sessions.workspace_id
         WHERE sessions.id = ?`,
      )
      .get(sessionId) as DatabaseRow | undefined;
    return row ? mapSession(row) : null;
  }

  public list(): readonly SessionRecord[] {
    const rows = this.database
      .prepare(
        `SELECT sessions.*, workspaces.root_path AS workspace_root
         FROM sessions
         INNER JOIN workspaces ON workspaces.id = sessions.workspace_id
         WHERE sessions.archived_at IS NULL AND workspaces.removed_at IS NULL
         ORDER BY sessions.updated_at DESC`,
      )
      .all() as DatabaseRow[];
    return rows.map(mapSession);
  }

  public setArchived(sessionId: string, archivedAt: number | null, updatedAt: number): boolean {
    return (
      this.database
        .prepare("UPDATE sessions SET archived_at = ?, updated_at = ? WHERE id = ?")
        .run(archivedAt, updatedAt, sessionId).changes > 0
    );
  }

  public updateIndex(sessionId: string, lastSeq: number, updatedAt: number): boolean {
    return (
      this.database
        .prepare(
          `UPDATE sessions
           SET last_seq = ?, updated_at = ?
           WHERE id = ? AND last_seq < ?`,
        )
        .run(lastSeq, updatedAt, sessionId, lastSeq).changes > 0
    );
  }

  public updateModel(
    sessionId: string,
    providerId: string,
    modelId: string,
    updatedAt: number,
  ): boolean {
    return (
      this.database
        .prepare(
          `UPDATE sessions
           SET provider_id = ?, model_id = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(providerId, modelId, updatedAt, sessionId).changes > 0
    );
  }

  public updateTitle(sessionId: string, title: string, updatedAt: number): boolean {
    return (
      this.database
        .prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?")
        .run(title, updatedAt, sessionId).changes > 0
    );
  }
}

class SqliteWorkspaceRepository implements WorkspaceRepository {
  public constructor(private readonly database: DatabaseSync) {}

  public create(rootPath: string, createdAt: number): WorkspaceRecord {
    const existing = this.database
      .prepare("SELECT id FROM workspaces WHERE root_path = ?")
      .get(rootPath) as DatabaseRow | undefined;
    const workspaceId = existing ? readRequiredString(existing, "id") : randomUUID();

    this.database
      .prepare(
        `INSERT INTO workspaces (id, root_path, created_at, updated_at, removed_at, sort_order)
         SELECT ?, ?, ?, ?, NULL, COALESCE(MIN(sort_order), 0) - 1
         FROM workspaces
         WHERE removed_at IS NULL
         ON CONFLICT(root_path) DO UPDATE SET
           removed_at = NULL,
           sort_order = excluded.sort_order,
           updated_at = excluded.updated_at`,
      )
      .run(workspaceId, rootPath, createdAt, createdAt);

    const workspace = this.find(workspaceId);
    if (!workspace) throw new Error("Created workspace could not be read");
    return workspace;
  }

  public find(workspaceId: string): WorkspaceRecord | null {
    const row = this.database.prepare("SELECT * FROM workspaces WHERE id = ?").get(workspaceId) as
      | DatabaseRow
      | undefined;
    return row ? mapWorkspace(row) : null;
  }

  public list(): readonly WorkspaceRecord[] {
    const rows = this.database
      .prepare(
        `SELECT * FROM workspaces
         WHERE removed_at IS NULL
         ORDER BY sort_order, updated_at DESC`,
      )
      .all() as DatabaseRow[];
    return rows.map(mapWorkspace);
  }

  public remove(workspaceId: string, removedAt: number): boolean {
    return (
      this.database
        .prepare(
          "UPDATE workspaces SET removed_at = ?, updated_at = ? WHERE id = ? AND removed_at IS NULL",
        )
        .run(removedAt, removedAt, workspaceId).changes > 0
    );
  }

  public reorder(workspaceIds: readonly string[], updatedAt: number): void {
    const update = this.database.prepare(
      `UPDATE workspaces
       SET sort_order = ?, updated_at = ?
       WHERE id = ? AND removed_at IS NULL`,
    );

    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const [sortOrder, workspaceId] of workspaceIds.entries()) {
        if (update.run(sortOrder, updatedAt, workspaceId).changes !== 1) {
          throw new Error("Workspace order changed while it was being saved");
        }
      }
      this.database.exec("COMMIT");
    } catch (error: unknown) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  public updateName(workspaceId: string, name: string, updatedAt: number): WorkspaceRecord | null {
    const updated =
      this.database
        .prepare(
          "UPDATE workspaces SET display_name = ?, updated_at = ? WHERE id = ? AND removed_at IS NULL",
        )
        .run(name, updatedAt, workspaceId).changes > 0;
    return updated ? this.find(workspaceId) : null;
  }
}

export interface HarnessDatabase {
  appSettings: AppSettingRepository;
  authSessions: AuthSessionRepository;
  close(): void;
  providerSettings: ProviderSettingRepository;
  sessions: SessionRepository;
  workspaces: WorkspaceRepository;
}

/** 打开 daemon 数据库，并在接收请求前执行尚未应用的 migration。 */
export function openHarnessDatabase(databasePath: string): HarnessDatabase {
  mkdirSync(dirname(databasePath), { mode: 0o700, recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  runMigrations(database);

  return {
    appSettings: new SqliteAppSettingRepository(database),
    authSessions: new SqliteAuthSessionRepository(database),
    close: () => database.close(),
    providerSettings: new SqliteProviderSettingRepository(database),
    sessions: new SqliteSessionRepository(database),
    workspaces: new SqliteWorkspaceRepository(database),
  };
}
