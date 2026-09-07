# Connected project inspection

Use `web_fetch` with the gateway base from the loaded SKILL.md plus a supported path:

- `/v1/organizations`, `/v1/organizations/{slug}/projects`, `/v1/projects`: discover the requested organization/project.
- `/v1/projects/{ref}`: project metadata.
- `/v1/projects/{ref}/health?services=auth&services=db&services=storage`: service health.
- `/v1/projects/{ref}/database/openapi`: exposed database schema.
- `/v1/projects/{ref}/config/database/postgres`: Postgres configuration.
- `/v1/projects/{ref}/config/database/pooler` or `/pgbouncer`: pooler settings.
- `/v1/projects/{ref}/readonly`: read-only mode status.

Keep result sets narrow, omit secrets and stop on authorization errors rather than requesting broader unrelated data. Exposed OpenAPI metadata is not a complete catalog of private schemas, grants or RLS policies. For those, use an authorized CLI/SQL inspection when available. The dedicated project-overview and database-inspection skills cover these read-only operations too.
