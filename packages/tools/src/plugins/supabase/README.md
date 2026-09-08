# Supabase

Supabase development guidance and Postgres best practices, plus connected read-only project and database inspection. Development commands use an independently configured local CLI through the normal command approval policy.

## OAuth configuration

Create a Supabase OAuth App, set its callback URL to
`http://localhost:4310/api/skill-connections/supabase/oauth/callback`, then write its credentials to
`oauth.clientId` and `oauth.clientSecret` in `manifest.yaml`.

Grant only the read scopes used by the bundled skills.

## Logo

The Supabase logo is provided by the Iconify Logos collection.

## Skills and resources

- `supabase`: development, troubleshooting, access review and local migrations.
- `supabase-postgres-best-practices`: task-specific SQL rules in eight categories.

The development and Postgres guides include Supabase MIT notices in their Skill directories. Gateway authentication and local CLI authentication are separate.
