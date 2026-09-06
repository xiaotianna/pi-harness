---
name: microsoft-identity-diagnostics
description: Inspect Microsoft Entra ID OIDC discovery, keys, and user info.
---

# Entra ID 诊断

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/microsoft` followed by:

- `/.well-known/openid-configuration` for OAuth/OIDC endpoints and capabilities.
- `/discovery/v2.0/keys` for RS256 signing keys.
- `/oidc/userinfo` for the connected user's OIDC claims.

The plugin authorizes with `/oauth2/v2.0/authorize`, exchanges at `/oauth2/v2.0/token`, and requests `openid profile email User.Read`. Diagnose issuer, audience, PKCE, scope, key ID, or claim mismatches without revoking tokens.
