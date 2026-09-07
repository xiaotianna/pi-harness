---
name: notion-workspace-search
description: Search pages and data sources shared with the connected Notion integration.
---

# 工作区检索

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/notion/v1/search?query=...` to search the pages and data sources shared with the integration. Omit `query` only when the user explicitly wants a bounded overview of all accessible content.

Return the strongest matching titles, object types, last-edited times, and URLs. Search results only cover content the user shared with the Notion integration.

Do not create, update, archive, restore, or delete Notion content.
