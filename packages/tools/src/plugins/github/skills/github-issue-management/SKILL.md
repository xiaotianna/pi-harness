---
name: github-issue-management
description: Read GitHub issues, comments, labels, and timelines.
---

# Issue 管理

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/github` followed by a GitHub REST path:

- `/search/issues?q=...` to locate issues.
- `/repos/{owner}/{repo}/issues/{issue_number}` for the issue body and state.
- `/repos/{owner}/{repo}/issues/{issue_number}/comments` for discussion.
- `/repos/{owner}/{repo}/issues/{issue_number}/timeline` for linked pull requests and events.

Read only the endpoints needed for the question. Include labels, assignees, milestones, and linked work when relevant, and clearly separate confirmed facts from interpretation.

Do not create, edit, close, label, assign, or comment on issues.
