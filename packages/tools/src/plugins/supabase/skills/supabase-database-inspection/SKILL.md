---
name: supabase-database-inspection
description: Inspect Supabase database schemas and read-only database configuration.
---

# 数据库检查

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/supabase` followed by:

- `/v1/projects/{ref}/database/openapi` to inspect the exposed database schema.
- `/v1/projects/{ref}/config/database/postgres` for Postgres configuration.
- `/v1/projects/{ref}/config/database/pooler` or `/pgbouncer` for connection-pool settings.
- `/v1/projects/{ref}/readonly` for read-only mode status.

Summarize schemas, tables, relationships, and operational settings relevant to the request. Never expose credentials or connection secrets if an upstream response unexpectedly contains them.

Do not run SQL or change database, pooler, schema, or project configuration.
