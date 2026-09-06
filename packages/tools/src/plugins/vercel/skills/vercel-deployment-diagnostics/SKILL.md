---
name: vercel-deployment-diagnostics
description: Inspect Vercel deployments, build output, status, and runtime logs.
---

# 部署诊断

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/vercel` followed by these Vercel API paths:

- `/v6/deployments?projectId=...` to list and filter deployments.
- `/v13/deployments/{idOrUrl}` to read deployment status and metadata.
- `/v3/deployments/{idOrUrl}/events` to inspect build events and logs.
- `/v6/deployments/{id}/files` and `/v2/deployments/{id}/aliases` for deployed files and aliases.

Locate the requested deployment, correlate its state with build events, and report the failure point and smallest useful next action. URL-encode path and query values.

Treat the integration as read-only. Do not create, redeploy, promote, cancel, or remove deployments.
