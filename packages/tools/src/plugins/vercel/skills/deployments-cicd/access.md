# Vercel gateway access

Use `web_fetch` with the base in SKILL.md and URL-encoded IDs/query values:

- `/v2/teams`: identify the requested team; pass its `teamId` on team-owned requests.
- `/v9/projects` and `/v9/projects/{idOrName}`: project metadata.
- `/v9/projects/{idOrName}/domains`: domain configuration.
- `/v9/projects/{idOrName}/env`: environment metadata only; do not request decrypted values.
- `/v6/deployments?projectId=...`: recent deployments.
- `/v13/deployments/{idOrUrl}`: selected deployment state.
- `/v3/deployments/{idOrUrl}/events`: deployment/build events.
- `/v6/deployments/{id}/files` and `/v2/deployments/{id}/aliases`: files and aliases.

The gateway does not deploy, promote, provision resources or expose every Vercel API. Use the independently configured CLI only for requested operations it actually supports. Check account/team/project and production vs preview before mutations. If authentication or a capability is missing, prepare reviewable workspace changes and report the concrete prerequisite.
