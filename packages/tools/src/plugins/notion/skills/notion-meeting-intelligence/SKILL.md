---
name: notion-meeting-intelligence
description: Prepare agendas, pre-reads and decision materials from accessible Notion pages and the supplied meeting context.
license: MIT
---

# 会议准备

## Access and output

The connected gateway base is `{skillGatewayUrl}/api/skill-gateway/notion`. Read [access and delivery](references/access.md) before retrieving content. This skill produces locally reviewable drafts with source links using the available read-only connection. Preserve the user's requested scope and use known context before asking for missing details.

## Workflow

Use the stated objective, participants, duration and timezone. Read the template selection guide, then the relevant meeting template. Gather prior decisions, active tasks, blockers and source documents. Assign agenda timeboxes that fit the meeting and identify expected outputs. Label unknown owners and unresolved questions. Add external research only when useful and cite it separately. Deliver the agenda, pre-read and follow-up list as a local draft; do not schedule meetings or assign tasks without the corresponding request.

Templates describe possible properties and sections. Match the actual destination schema and omit irrelevant sections. Example dates, people, IDs, metrics and project names are illustrative. Do not transfer them into the user's deliverable as facts.

## Task-specific references

- [Brainstorming Meeting Template](references/brainstorming-template.md)
- [Decision Meeting Template](references/decision-meeting-template.md)
- [1:1 Meeting Template](references/one-on-one-template.md)
- [Retrospective Template](references/retrospective-template.md)
- [Sprint Planning Template](references/sprint-planning-template.md)
- [Status Update Meeting Template](references/status-update-template.md)
- [Meeting Template Selection Guide](references/template-selection-guide.md)

Read only the references needed for the current task. Check that the draft answers the request, preserves source attribution and marks unknowns before delivery.

## License

Adapted from Notion Labs materials under the [included license](LICENSE.txt).
