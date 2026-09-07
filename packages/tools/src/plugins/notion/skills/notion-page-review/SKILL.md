---
name: notion-page-review
description: Read Notion page properties, block content, and data source schemas and entries.
---

# 页面与数据库查看

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/notion` followed by the narrowest relevant Notion API path:

- `/v1/pages/{pageId}` for page properties.
- `/v1/blocks/{blockId}/children` for page or block content.
- `/v1/data_sources/{dataSourceId}` for a data source schema.
- `/v1/data_sources/{dataSourceId}/query` for its accessible entries.

Read child blocks recursively only when needed and keep each request bounded. Preserve the distinction between page properties, block content, and database rows in the summary.

Do not create, update, archive, restore, or delete Notion content.
