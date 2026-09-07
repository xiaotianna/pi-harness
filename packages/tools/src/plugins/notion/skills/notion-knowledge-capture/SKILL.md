---
name: notion-knowledge-capture
description: Turn conversations and notes into sourced wiki, FAQ, how-to and decision-record drafts using accessible Notion context.
license: MIT
---

# 知识整理

## Access and output

The connected gateway base is `{skillGatewayUrl}/api/skill-gateway/notion`. Read [access and delivery](references/access.md) before retrieving content. This skill produces locally reviewable drafts with source links using the available read-only connection. Preserve the user's requested scope and use known context before asking for missing details.

## Workflow

Identify the audience and requested content type from the conversation. Read the matching database template, then search existing pages to avoid duplicating knowledge. Distinguish documented facts, accepted decisions, proposals and unresolved questions. Preserve rationale and source links. For an update, read the existing page and identify the exact sections/properties to change. Deliver a structured Markdown draft and proposed property values; never invent owners, dates, relations or status values.

Templates describe possible properties and sections. Match the actual destination schema and omit irrelevant sections. Example dates, people, IDs, metrics and project names are illustrative. Do not transfer them into the user's deliverable as facts.

## Task-specific references

- [Database Best Practices](references/database-best-practices.md)
- [Decision Log Database (ADR - Architecture Decision Records)](references/decision-log-database.md)
- [General Documentation Database](references/documentation-database.md)
- [FAQ Database](references/faq-database.md)
- [How-To Guide Database](references/how-to-guide-database.md)
- [Learning/Post-Mortem Database](references/learning-database.md)
- [Team Wiki Database](references/team-wiki-database.md)

Read only the references needed for the current task. Check that the draft answers the request, preserves source attribution and marks unknowns before delivery.

## License

Adapted from Notion Labs materials under the [included license](LICENSE.txt).
