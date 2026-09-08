# Notion

Connect a Notion workspace and give the Agent focused, read-only Notion skills.

## OAuth configuration

Create a public Notion integration, set its redirect URI to
`http://localhost:4310/api/skill-connections/notion/oauth/callback`, then write its credentials to
`oauth.clientId` and `oauth.clientSecret` in `manifest.yaml`.

Set `oauth.callbackUrl` to the same registered URI. When omitted, the daemon generates the
callback from its gateway URL and plugin ID. The callback must be an HTTP(S) loopback URL.

## Logo

The Notion logo is provided by the Iconify Logos collection.

## Knowledge workflows

Four skills prepare knowledge records, meeting materials, research reports, and implementation plans from accessible Notion context. Templates are loaded on demand. The gateway remains read-only; outputs are reviewable local drafts, and publishing requires an available write integration. Each adapted skill includes the Notion Labs license.
