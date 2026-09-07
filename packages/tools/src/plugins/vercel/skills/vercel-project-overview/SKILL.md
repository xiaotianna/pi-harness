---
name: vercel-project-overview
description: Read Vercel projects, domains, environments, and recent deployments.
---

# 项目概览

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/vercel` followed by these Vercel API paths:

- `/v9/projects` to list or search projects.
- `/v9/projects/{idOrName}` for project settings.
- `/v9/projects/{idOrName}/domains` for domains.
- `/v9/projects/{idOrName}/env` for environment-variable metadata.
- `/v6/deployments?projectId=...` for recent deployments.

For team-owned resources, first read `/v2/teams`, then pass the selected `teamId` query parameter to project and deployment requests.

Gather only the fields relevant to the request. Never expose environment-variable values; report keys, targets, and metadata only.

Do not change project settings, domains, environment variables, or deployments.
