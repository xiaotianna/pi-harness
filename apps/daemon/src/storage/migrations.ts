import type { DatabaseSync } from "node:sqlite";

export type DatabaseMigration =
  | { sql: string; version: string }
  | { migrate: (database: DatabaseSync) => void; version: string };

/**
 * migration 按顺序保存，使数据库结构变更明确，并能随 TypeScript 构建产物一起发布。
 * 不要修改已执行的 migration；数据库结构变化时追加新版本。
 */
export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = [
  {
    // 保留原 SQL 文件名作为版本号，避免已有开发数据库重复执行该 migration。
    version: "001-github-auth.sql",
    sql: `
      CREATE TABLE auth_users (
        id TEXT PRIMARY KEY,
        github_user_id TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT NOT NULL,
        profile_url TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE auth_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
      ) STRICT;

      CREATE INDEX auth_sessions_user_id_idx ON auth_sessions(user_id);
      CREATE INDEX auth_sessions_expires_at_idx ON auth_sessions(expires_at);
    `,
  },
  {
    version: "002-provider-settings.sql",
    sql: `
      CREATE TABLE provider_settings (
        provider_id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('builtin', 'custom')),
        name TEXT,
        protocol TEXT,
        base_url TEXT,
        model_ids_json TEXT NOT NULL DEFAULT '[]',
        requires_api_key INTEGER NOT NULL DEFAULT 1 CHECK (requires_api_key IN (0, 1)),
        enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CHECK (
          (kind = 'builtin' AND name IS NULL AND protocol IS NULL AND base_url IS NULL)
          OR
          (kind = 'custom' AND name IS NOT NULL AND protocol IS NOT NULL AND base_url IS NOT NULL)
        )
      ) STRICT;
    `,
  },
  {
    version: "003-workspaces-sessions.sql",
    sql: `
      CREATE TABLE workspaces (
        id TEXT PRIMARY KEY,
        root_path TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        title TEXT NOT NULL,
        last_seq INTEGER NOT NULL DEFAULT 0 CHECK (last_seq >= 0),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
      ) STRICT;

      CREATE INDEX sessions_workspace_id_idx ON sessions(workspace_id);
      CREATE INDEX sessions_updated_at_idx ON sessions(updated_at DESC);
    `,
  },
  {
    version: "004-session-archive.sql",
    sql: `
      ALTER TABLE sessions ADD COLUMN archived_at INTEGER;
      CREATE INDEX sessions_archived_updated_at_idx
        ON sessions(archived_at, updated_at DESC);
    `,
  },
  {
    version: "005-workspace-metadata.sql",
    sql: `
      ALTER TABLE workspaces ADD COLUMN display_name TEXT;
      ALTER TABLE workspaces ADD COLUMN removed_at INTEGER;
      CREATE INDEX workspaces_removed_updated_at_idx
        ON workspaces(removed_at, updated_at DESC);
    `,
  },
  {
    version: "006-workspace-order.sql",
    sql: `
      ALTER TABLE workspaces ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
      DROP INDEX workspaces_removed_updated_at_idx;
      CREATE INDEX workspaces_removed_sort_order_idx
        ON workspaces(removed_at, sort_order, updated_at DESC);
    `,
  },
  {
    version: "007-approval-policy-settings.sql",
    sql: `
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;
    `,
  },
  {
    version: "009-session-approval-policy.sql",
    migrate: (database) => {
      database.exec(`
        INSERT INTO app_settings (key, value, updated_at)
        SELECT 'default_approval_policy', value, updated_at
        FROM app_settings
        WHERE key = 'approval_policy'
        ON CONFLICT(key) DO NOTHING;

        DELETE FROM app_settings WHERE key = 'approval_policy';
      `);

      const hasApprovalPolicyColumn =
        database
          .prepare("SELECT 1 FROM pragma_table_info('sessions') WHERE name = 'approval_policy'")
          .get() !== undefined;
      if (hasApprovalPolicyColumn) return;

      database.exec(`
        ALTER TABLE sessions ADD COLUMN approval_policy TEXT NOT NULL DEFAULT 'request_approval'
          CHECK (approval_policy IN ('request_approval', 'auto_approve', 'full_access'));

        UPDATE sessions
        SET approval_policy = COALESCE(
          (SELECT value FROM app_settings WHERE key = 'default_approval_policy'),
          'request_approval'
        );
      `);
    },
  },
  {
    version: "010-global-approval-policy.sql",
    migrate: (database) => {
      database.exec(`
        INSERT INTO app_settings (key, value, updated_at)
        SELECT 'approval_policy', value, updated_at
        FROM app_settings
        WHERE key = 'default_approval_policy'
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at;

        DELETE FROM app_settings WHERE key = 'default_approval_policy';
      `);

      const hasApprovalPolicyColumn =
        database
          .prepare("SELECT 1 FROM pragma_table_info('sessions') WHERE name = 'approval_policy'")
          .get() !== undefined;
      if (hasApprovalPolicyColumn) {
        database.exec("ALTER TABLE sessions DROP COLUMN approval_policy");
      }
    },
  },
];
