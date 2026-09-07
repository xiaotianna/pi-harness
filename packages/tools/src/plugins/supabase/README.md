# Supabase

Connect a Supabase account and give the Agent focused, read-only Management API skills.

## OAuth configuration

Create a Supabase OAuth App, set its callback URL to
`http://localhost:4310/api/skill-connections/supabase/oauth/callback`, then write its credentials to
`oauth.clientId` and `oauth.clientSecret` in `manifest.yaml`.

Grant only the read scopes used by the bundled skills.

## Logo

The Supabase logo is provided by the Iconify Logos collection.
