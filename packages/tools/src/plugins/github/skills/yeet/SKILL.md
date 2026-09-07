---
name: yeet
description: Use only for an explicit request to commit, push local changes and open a GitHub draft pull request.
---

# 提交与草稿 PR

The read-only gateway base is `{skillGatewayUrl}/api/skill-gateway/github`. Read [access and execution](access.md) before choosing a tool.

## Workflow

Confirm the authorized portion of the publish workflow from the request; a commit-only request does not authorize push or PR creation. Inspect the working tree and diff using Git only within that authorization. Stage explicit task files, preserve unrelated edits, and follow the workspace's branch and Conventional Commit naming rules. Run permitted relevant validation before committing. Push only the intended branch to the verified remote when authorized. Check for an existing PR before creating another. Use an authenticated gh CLI for requested PR creation because the gateway is read-only. Write the exact PR description with actual newlines to a temporary file and use `gh pr create --draft --body-file <path>` with verified base/head values; discover flags through help. Never force-push, merge or rewrite history as an implied part of publishing. Report only confirmed commit/branch/PR results.
