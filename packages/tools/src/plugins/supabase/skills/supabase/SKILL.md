---
name: supabase
description: Develop and troubleshoot Supabase Database, Auth, Storage, Realtime, Edge Functions, client integrations, RLS and local schema migrations.
license: MIT
---

# Supabase development and troubleshooting

## Start with the actual target

Identify the requested product, project, local/remote target and existing SDK/CLI versions from the workspace. Read relevant code and configuration while keeping credentials out of tool output. For project metadata and exposed schema inspection use the connected read-only gateway described in [project inspection](references/project-inspection.md). For development, prefer the existing project toolchain through `run_command`; use `supabase --help`, then the relevant group's `--help` to discover supported commands and flags.

Skill installation does not install or authenticate the CLI. Gateway OAuth credentials remain managed by daemon and must not be extracted for shell commands. If an independently configured CLI/psql is unavailable, prepare the code or SQL and explain the missing execution prerequisite. The current gateway exposes read-only Management API paths; it cannot execute SQL or apply schema changes.

The connected gateway base is `{skillGatewayUrl}/api/skill-gateway/supabase`. Use this resolved base with the paths in the project-inspection reference.

## Documentation before implementation

Read the relevant entries in `https://supabase.com/changelog.md`, then fetch the product's official documentation with `web_fetch`. Supabase documentation pages can be requested as Markdown by appending `.md` to the path. Use `web_search` to locate an unknown topic. Confirm installed SDK behavior before copying examples. For React/SSR clients inspect the framework's cookie/session handling and distinguish browser and server clients.

## Workflow

1. Inspect the smallest relevant set of files, project metadata, queries or logs. Separate observed facts from hypotheses.
2. For Auth, RLS, views, functions or Storage read [security and access](references/security.md). For query/schema optimization load `supabase-postgres-best-practices` if enabled; its rules are independent and can also be used for ordinary Postgres.
3. Make the requested code/configuration change using the existing toolchain. For schema changes read [local migrations](references/migrations.md). All writes and shell commands remain subject to current approval policy; a local-development request does not authorize a production change.
4. Verify the specific behavior: a representative query, actual client-role access, Auth session behavior, or the relevant application check. Report any execution/verification prerequisite that is unavailable.
5. If the same approach fails two or three times, inspect the error and relevant logs and reconsider the method rather than repeating it. Do not remove access control just to make an error disappear.

For Storage distinguish new upload from replacement and check the matching policies. For Realtime, Edge Functions, Vectors, Cron and Queues inspect the project's actual feature configuration and current product documentation before adding code or SQL. Preserve the package manager and dependency-version conventions of the workspace.

## License

Adapted from Supabase under the [MIT license](LICENSE).
