---
name: google-drive-comments
description: Read Google Drive comment threads and prepare evidence-linked review comments or replies for Docs, Sheets and Slides.
---

# Drive 评论审阅

The gateway base is `{skillGatewayUrl}/api/skill-gateway/google`. Read [access and coverage](references/access.md) before choosing a retrieval or output route.

## Workflow

Read file metadata and the relevant content before interpreting a comment. Load live comment IDs and replies, distinguish resolved/deleted threads, and avoid attributing stale discussion to the current document. Draft each proposed comment with an exact quote or verified location: document section, spreadsheet tab/range, slide number and visible text, or file/page context. Never rely on an API anchor alone to identify the location. Prepare create/reply/resolve proposals separately with their target IDs, but do not claim any was posted or resolved through the read-only gateway.

Read [preservation and delivery](references/preservation.md) for editing and template requests. Use the supplied facts and current project instructions; ask only for information that materially blocks the requested task.
