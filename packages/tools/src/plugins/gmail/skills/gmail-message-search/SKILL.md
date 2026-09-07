---
name: gmail-message-search
description: Search Gmail messages and read matching message metadata, bodies, and attachments.
---

# 邮件检索

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/gmail` followed by a Gmail API path:

- `/gmail/v1/users/me/messages?q=...&maxResults=...` to search messages.
- `/gmail/v1/users/me/messages/{messageId}?format=full` to read a matching message.
- `/gmail/v1/users/me/messages/{messageId}/attachments/{attachmentId}` only when the requested content is in an attachment.

URL-encode Gmail search queries and keep result sets bounded. Summarize sender, recipients, subject, time, labels, and the relevant body content.

Do not send, import, modify, trash, or delete messages.
