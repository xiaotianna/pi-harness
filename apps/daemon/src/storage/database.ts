import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
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

function mapAuthUser(row: DatabaseRow): AuthUser {
  return {
    id: readRequiredString(row, "id"),
    username: readRequiredString(row, "username"),
    displayName: readNullableString(row, "display_name"),
    avatarUrl: readRequiredString(row, "avatar_url"),
    profileUrl: readRequiredString(row, "profile_url"),
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
      database.exec(migration.sql);
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

export interface HarnessDatabase {
  authSessions: AuthSessionRepository;
  close(): void;
}

/** 打开 daemon 数据库，并在接收请求前执行尚未应用的 migration。 */
export function openHarnessDatabase(databasePath: string): HarnessDatabase {
  mkdirSync(dirname(databasePath), { mode: 0o700, recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  runMigrations(database);

  return {
    authSessions: new SqliteAuthSessionRepository(database),
    close: () => database.close(),
  };
}
