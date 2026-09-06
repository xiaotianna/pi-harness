---
name: slack-message-search
description: Search Slack messages, threads, channels, and shared links.
---

# 消息检索

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/slack` and search a bounded set of conversation histories:

- `/api/conversations.list?types=public_channel,private_channel,im,mpim` to find candidate conversations.
- `/api/conversations.history?channel=...&oldest=...&latest=...&limit=...` to read bounded history.
- `/api/conversations.replies?channel=...&ts=...` to inspect matching threads.
- `/api/users.info?user=...` to resolve authors.

Pass method parameters in the query string; the gateway converts them to Slack form parameters. Search only the smallest relevant channels and time range, then return matching messages with channel and timestamp context.

Do not send, edit, react to, pin, or delete messages.
