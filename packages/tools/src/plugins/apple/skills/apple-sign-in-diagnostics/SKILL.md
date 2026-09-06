---
name: apple-sign-in-diagnostics
description: Inspect Sign in with Apple OIDC discovery, keys, and connected identity claims.
---

# Apple 登录诊断

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/apple` followed by:

- `/.well-known/openid-configuration` to inspect issuer and supported OAuth/OIDC capabilities.
- `/auth/keys` to inspect the JWKS used for RS256 ID-token verification.

The plugin's OAuth connection uses `/auth/authorize` and `/auth/token`, with `openid email name` scopes. Diagnose issuer, endpoint, audience, key ID, and signing-algorithm mismatches from these documents.

Do not revoke tokens or modify emulator state.
