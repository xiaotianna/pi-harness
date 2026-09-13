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
  {
    version: "011-session-thinking-level.sql",
    sql: `
      ALTER TABLE sessions ADD COLUMN thinking_level TEXT NOT NULL DEFAULT 'medium'
        CHECK (thinking_level IN ('low', 'medium', 'high'));
    `,
  },
  {
    version: "012-session-search-index.sql",
    sql: `
      CREATE TABLE session_search_documents (
        session_id TEXT PRIMARY KEY,
        source_size INTEGER NOT NULL CHECK (source_size >= 0),
        description TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      ) STRICT;

      CREATE VIRTUAL TABLE session_search_messages USING fts5(
        session_id UNINDEXED,
        event_id UNINDEXED,
        message_index UNINDEXED,
        search_text,
        display_text UNINDEXED,
        tokenize='trigram'
      );
    `,
  },
  {
    version: "013-model-thinking-levels.sql",
    sql: `
      CREATE TEMP TABLE session_thinking_levels (
        session_id TEXT PRIMARY KEY,
        thinking_level TEXT NOT NULL
      ) STRICT;

      INSERT INTO session_thinking_levels (session_id, thinking_level)
      SELECT id, thinking_level FROM sessions;

      ALTER TABLE sessions DROP COLUMN thinking_level;
      ALTER TABLE sessions ADD COLUMN thinking_level TEXT NOT NULL DEFAULT 'medium'
        CHECK (thinking_level IN ('off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'));

      UPDATE sessions
      SET thinking_level = (
        SELECT thinking_level
        FROM session_thinking_levels
        WHERE session_id = sessions.id
      );

      DROP TABLE session_thinking_levels;
    `,
  },
  {
    version: "014-mcp-servers.sql",
    sql: `
      CREATE TABLE mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config_json TEXT NOT NULL CHECK (json_valid(config_json)),
        enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
        revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE workspace_mcp_servers (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
        PRIMARY KEY (workspace_id, server_id)
      ) STRICT;
      CREATE INDEX workspace_mcp_servers_server_idx ON workspace_mcp_servers(server_id);

      CREATE TABLE mcp_server_trust (
        server_id TEXT PRIMARY KEY REFERENCES mcp_servers(id) ON DELETE CASCADE,
        revision INTEGER NOT NULL CHECK (revision > 0),
        approved_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE mcp_tool_settings (
        server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
        tool_name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
        trusted_read_only INTEGER NOT NULL DEFAULT 0 CHECK (trusted_read_only IN (0, 1)),
        definition_fingerprint TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (server_id, tool_name)
      ) STRICT;

      CREATE TABLE mcp_grants (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        identity TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        definition_fingerprint TEXT NOT NULL,
        arguments_fingerprint TEXT NOT NULL,
        config_revision INTEGER NOT NULL CHECK (config_revision > 0),
        expires_at INTEGER,
        created_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX mcp_grants_scope_idx ON mcp_grants(server_id, workspace_id, tool_name);
    `,
  },
  {
    version: "015-global-mcp-servers.sql",
    // 全局配置、启用状态、信任及凭据保持原值，只移除旧的项目启用关系。
    sql: `DROP TABLE workspace_mcp_servers;`,
  },
  {
    version: "016-mcp-catalogs.sql",
    sql: `
      CREATE TABLE mcp_catalogs (
        server_id TEXT PRIMARY KEY REFERENCES mcp_servers(id) ON DELETE CASCADE,
        config_revision INTEGER NOT NULL CHECK (config_revision > 0),
        catalog_json TEXT NOT NULL CHECK (json_valid(catalog_json)),
        updated_at INTEGER NOT NULL
      ) STRICT;
    `,
  },
  {
    version: "017-memories.sql",
    sql: `
      CREATE TABLE memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        normalized_content TEXT NOT NULL,
        scope TEXT NOT NULL CHECK (scope IN ('user', 'workspace')),
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('saved', 'suggested')),
        source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'session')),
        source_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
        revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CHECK (
          (scope = 'user' AND workspace_id IS NULL)
          OR (scope = 'workspace' AND workspace_id IS NOT NULL)
        )
      ) STRICT;

      CREATE UNIQUE INDEX memories_scope_content_idx
        ON memories(scope, COALESCE(workspace_id, ''), normalized_content);
      CREATE INDEX memories_visibility_idx
        ON memories(status, scope, workspace_id, updated_at DESC);

      CREATE VIRTUAL TABLE memory_search USING fts5(
        memory_id UNINDEXED,
        content,
        tokenize='trigram'
      );

      CREATE TABLE memory_settings (
        key TEXT PRIMARY KEY CHECK (key IN ('use_memories', 'generate_memories')),
        value INTEGER NOT NULL CHECK (value IN (0, 1)),
        updated_at INTEGER NOT NULL
      ) STRICT;
    `,
  },
  {
    version: "018-memory-user-profile.sql",
    sql: `
      ALTER TABLE memories ADD COLUMN profile_facet TEXT
        CHECK (profile_facet IS NULL OR profile_facet IN (
          'background', 'communication', 'expertise', 'interests', 'preferences', 'workflow'
        ));

      UPDATE memories SET profile_facet = 'preferences' WHERE scope = 'user';
    `,
  },
  {
    version: "019-memory-embeddings.sql",
    sql: `
      CREATE TABLE memory_embedding_settings (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE memory_embeddings (
        memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL CHECK (dimensions > 0),
        embedding BLOB NOT NULL,
        memory_revision INTEGER NOT NULL CHECK (memory_revision > 0),
        updated_at INTEGER NOT NULL,
        CHECK (length(embedding) = dimensions * 4)
      ) STRICT;

      CREATE INDEX memory_embeddings_model_idx
        ON memory_embeddings(provider_id, model_id);
    `,
  },
  {
    version: "020-local-memory-embeddings.sql",
    sql: `
      DROP INDEX memory_embeddings_model_idx;
      DROP TABLE memory_embeddings;
      DROP TABLE memory_embedding_settings;

      CREATE TABLE memory_embedding_settings (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        model_id TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE memory_embeddings (
        memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
        model_id TEXT NOT NULL,
        dimensions INTEGER NOT NULL CHECK (dimensions > 0),
        embedding BLOB NOT NULL,
        memory_revision INTEGER NOT NULL CHECK (memory_revision > 0),
        updated_at INTEGER NOT NULL,
        CHECK (length(embedding) = dimensions * 4)
      ) STRICT;

      CREATE INDEX memory_embeddings_model_idx ON memory_embeddings(model_id);
    `,
  },
  {
    version: "021-repair-local-memory-embeddings.sql",
    migrate: (database) => {
      const hasLegacyProviderColumn =
        database
          .prepare(
            "SELECT 1 FROM pragma_table_info('memory_embeddings') WHERE name = 'provider_id'",
          )
          .get() !== undefined;
      if (!hasLegacyProviderColumn) return;

      database.exec(`
        DROP INDEX IF EXISTS memory_embeddings_model_idx;
        DROP TABLE memory_embeddings;
        DROP TABLE memory_embedding_settings;

        CREATE TABLE memory_embedding_settings (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          model_id TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        ) STRICT;

        CREATE TABLE memory_embeddings (
          memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
          model_id TEXT NOT NULL,
          dimensions INTEGER NOT NULL CHECK (dimensions > 0),
          embedding BLOB NOT NULL,
          memory_revision INTEGER NOT NULL CHECK (memory_revision > 0),
          updated_at INTEGER NOT NULL,
          CHECK (length(embedding) = dimensions * 4)
        ) STRICT;

        CREATE INDEX memory_embeddings_model_idx ON memory_embeddings(model_id);
      `);
    },
  },
  {
    version: "022-save-memory-suggestions.sql",
    sql: `UPDATE memories SET status = 'saved' WHERE status = 'suggested';`,
  },
];
