---
name: gmail-thread-summary
description: Read and summarize Gmail threads, participants, decisions, and follow-up items.
---

# 会话总结

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/gmail` followed by:

- `/gmail/v1/users/me/threads?q=...&maxResults=...` to locate a thread.
- `/gmail/v1/users/me/threads/{threadId}?format=full` to read its messages.

Summarize the conversation in chronological order, identify participants, decisions, unresolved questions, and requested follow-ups. Distinguish explicit commitments from inferred next steps.

Do not reply, forward, relabel, archive, or delete thread content.
