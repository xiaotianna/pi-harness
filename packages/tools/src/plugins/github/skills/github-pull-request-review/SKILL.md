---
name: github-pull-request-review
description: Read pull requests, changed files, reviews, and commits for code review.
---

# Pull Request 审查

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/github` followed by these GitHub REST paths for `{owner}`, `{repo}`, and `{pull_number}`:

- `/repos/{owner}/{repo}/pulls/{pull_number}` for metadata and base/head refs.
- `/repos/{owner}/{repo}/pulls/{pull_number}/files` for the patch.
- `/repos/{owner}/{repo}/pulls/{pull_number}/commits` for commit context.
- `/repos/{owner}/{repo}/pulls/{pull_number}/reviews` and `/comments` for review history.
- `/repos/{owner}/{repo}/commits/{ref}/check-runs` for checks.

Read the changed files before reporting findings. Prioritize concrete correctness, security, and regression risks; cite file paths and lines when available, and omit speculative findings without evidence.

Do not submit reviews, comments, labels, merges, or other mutations.
