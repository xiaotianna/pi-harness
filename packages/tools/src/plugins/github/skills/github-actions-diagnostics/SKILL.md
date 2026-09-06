---
name: github-actions-diagnostics
description: Inspect GitHub Actions workflows, runs, jobs, logs, and checks.
---

# Actions 诊断

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/github` followed by these GitHub REST paths:

- `/repos/{owner}/{repo}/actions/runs` to locate workflow runs.
- `/repos/{owner}/{repo}/actions/runs/{run_id}` for the selected run.
- `/repos/{owner}/{repo}/actions/runs/{run_id}/jobs` for failed jobs and steps.
- `/repos/{owner}/{repo}/commits/{ref}/check-runs` for related check output.

Start from the failing run, narrow to failed jobs and steps, and correlate them with the commit checks. Report the likely root cause, supporting evidence, and the smallest useful next action.

Do not rerun, cancel, dispatch, or modify workflows.
