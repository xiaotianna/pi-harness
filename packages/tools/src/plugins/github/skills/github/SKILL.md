---
name: github
description: Orient repository, issue and pull-request work and select review, CI or explicitly requested publishing workflows.
---

# GitHub 工作流

The read-only gateway base is `{skillGatewayUrl}/api/skill-gateway/github`. Read [access and execution](access.md) before choosing a tool.

## Workflow

Resolve the repository and item from the supplied URL or owner/repo identifier. For current-branch context, inspect local Git only when authorized by workspace rules. Read the narrowest metadata/patch/issue endpoint from the access guide. Route actionable review feedback to `gh-address-comments`, failing Actions to `gh-fix-ci`, and a requested commit/push/draft-PR flow to `yeet` via `load_skill` if enabled. Handle focused repository, issue and PR read-only questions using the access guide. Separate observed state from inferred next steps.
