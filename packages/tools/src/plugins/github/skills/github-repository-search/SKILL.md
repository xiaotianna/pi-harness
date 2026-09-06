---
name: github-repository-search
description: Search GitHub repositories, code, commits, and file contents.
---

# 仓库检索

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/github` followed by a GitHub REST path. Choose the narrowest endpoint for the request:

- `/search/repositories?q=...` for repositories.
- `/search/code?q=...` for code.
- `/search/commits?q=...` for commits.
- `/repos/{owner}/{repo}/contents/{path}` for repository files.

URL-encode query values, paginate only when the first page is insufficient, and summarize the strongest matches with repository names and GitHub URLs.

Do not create or modify GitHub resources. If authentication or access is unavailable, explain which repository or permission is missing.
