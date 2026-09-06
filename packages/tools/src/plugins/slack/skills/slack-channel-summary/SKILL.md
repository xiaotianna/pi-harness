---
name: slack-channel-summary
description: Summarize recent Slack channel discussions, decisions, and open questions.
---

# 频道总结

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/slack` followed by one of these read-only Slack Web API paths. Pass method parameters in the query string; the gateway converts them to Slack form parameters.

- `/api/conversations.list?types=public_channel,private_channel` to resolve a channel.
- `/api/conversations.history?channel=...&limit=...` for top-level messages.
- `/api/conversations.replies?channel=...&ts=...` for a thread.
- `/api/users.info?user=...` when an author must be resolved.

Summarize decisions, action items, unresolved questions, and owners without inventing missing context.

Do not post summaries or modify channel content.
