---
name: supabase-project-overview
description: Read Supabase organizations, projects, project metadata, and service health.
---

# 项目概览

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/supabase` followed by the narrowest relevant Management API path:

- `/v1/organizations` to list organizations.
- `/v1/organizations/{slug}/projects` or `/v1/projects` to list projects.
- `/v1/projects/{ref}` for one project's metadata.
- `/v1/projects/{ref}/health?services=auth&services=db&services=storage` for service health.

Report only the requested organization, region, status, and service-health details. Keep project listings bounded.

Do not create, pause, restart, transfer, update, or delete projects.
