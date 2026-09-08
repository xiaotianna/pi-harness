---
name: google-drive
description: Find and inspect Google Drive files, route Docs/Sheets/Slides work, and prepare requested file-operation plans.
---

# Drive 文件工作流

The gateway base is `{skillGatewayUrl}/api/skill-gateway/google`. Read [access and coverage](references/access.md) before choosing a retrieval or output route.

## Workflow

Resolve the target file from a supplied ID/URL or a narrow Drive query. Read its name, MIME type, parents, capabilities and modified time before choosing a route. Search results and metadata do not establish document contents. Route text documents to google-docs, spreadsheets to google-sheets, presentations to google-slides and review threads to google-drive-comments when those skills are enabled. Inspect shortcuts through their target metadata and distinguish My Drive from shared drives. For requested moves/shares/copies, prepare the exact source, destination and intended permissions locally; the current gateway cannot execute them.

Read [preservation and delivery](references/preservation.md) for editing and template requests. Use the supplied facts and current project instructions; ask only for information that materially blocks the requested task.
