---
name: notion-spec-to-implementation
description: Convert Notion specifications into implementation plans, task drafts, acceptance criteria and progress summaries.
license: MIT
---

# 需求转实施

## Access and output

The connected gateway base is `{skillGatewayUrl}/api/skill-gateway/notion`. Read [access and delivery](references/access.md) before retrieving content. This skill produces locally reviewable drafts with source links using the available read-only connection. Preserve the user's requested scope and use known context before asking for missing details.

## Workflow

Read the specification and extract goals, explicit requirements, constraints, acceptance criteria and unanswered questions. Choose the quick or standard plan template according to scope. Break work into independently checkable tasks with dependencies; use the actual task database schema when available. Preserve source links from specification to plan and tasks. Do not invent task IDs, estimates, owners or completed statuses. Implement workspace code only when requested; otherwise deliver the plan/task drafts. Progress summaries must reflect observed work and blockers. Recurring updates require a separately requested scheduling capability.

Templates describe possible properties and sections. Match the actual destination schema and omit irrelevant sections. Example dates, people, IDs, metrics and project names are illustrative. Do not transfer them into the user's deliverable as facts.

## Task-specific references

- [Milestone Summary Template](references/milestone-summary-template.md)
- [Progress Tracking](references/progress-tracking.md)
- [Progress Update Template](references/progress-update-template.md)
- [Quick Implementation Plan Template](references/quick-implementation-plan.md)
- [Specification Parsing](references/spec-parsing.md)
- [Standard Implementation Plan Template](references/standard-implementation-plan.md)
- [Task Creation Template](references/task-creation-template.md)
- [Task Creation from Specs](references/task-creation.md)

Read only the references needed for the current task. Check that the draft answers the request, preserves source attribution and marks unknowns before delivery.

## License

Adapted from Notion Labs materials under the [included license](LICENSE.txt).
