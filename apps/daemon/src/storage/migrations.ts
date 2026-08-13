export interface DatabaseMigration {
  sql: string;
  version: string;
}

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
];
