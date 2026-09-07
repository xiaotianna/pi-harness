---
name: google-drive-search
description: Search Google Drive files and read relevant document metadata.
---

# Drive 检索

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/google` followed by a Google Drive API path:

- `/drive/v3/files?q=...&fields=...` to list or search files.
- `/drive/v3/files/{fileId}?fields=...` to read one file's metadata.

URL-encode query values. Match by name, MIME type, parent, or modified time, then summarize the strongest results. This Skill only exposes metadata APIs, so do not claim to have read document contents.

Do not create, edit, move, share, or delete files.
