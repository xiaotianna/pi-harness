---
name: microfrontends
description: "Guide for building, configuring, and deploying microfrontends on Vercel. Use this skill when the user mentions microfrontends, multi-zones, splitting an app across teams, independent deployments, cross-app routing, incremental migration, composing multiple frontends under one domain, microfrontends.json, @vercel/microfrontends, the microfrontends local proxy, or path-based routing between Vercel projects. Also use when the user asks about shared layouts across projects, navigation between microfrontends, fallback environments, asset prefixes, or feature flag controlled routing."
license: Apache-2.0
---

# microfrontends

## PI Harness execution context

Use the user's actual repository, framework and request. This guide does not select a new stack, authorize deployments, or override project instructions. Discover only the tools actually available. Read-only project/deployment data can use the resolved gateway base below. Other commands require an installed and independently authenticated CLI through `run_command` under the current approval policy. Gateway credentials remain inside daemon.

Do not automatically run git, dev or build commands where the workspace requires an explicit request. Respect the existing package manager, dependency catalog and UI component rules. Deployment, production promotion, provisioning paid services, purchases, account changes and messages to others require the corresponding user authorization. Inspect environment metadata without exposing secret values. For browser verification use an available browser surface and an existing server; do not assume a particular browser CLI or start a server unasked. Do not spawn agents based solely on an example in the guide.

Documentation examples are version-sensitive. Check installed versions, CLI `--help` and current official documentation for the actual task. Treat sample commands/configurations as examples to adapt, not an automatic sequence. Only claim an action succeeded when the tool result verifies it.

The gateway base is `{skillGatewayUrl}/api/skill-gateway/vercel`. Available read paths are documented in [gateway access](access.md).

## Detailed guidance

Read the task-relevant sections of [the detailed guide](guide.md), then load its supporting resources only as needed. Technical examples retain their original context; the workspace's rules take precedence.

## Supporting resources

- [references/configuration.md](references/configuration.md)
- [references/local-development.md](references/local-development.md)
- [references/managing-microfrontends.md](references/managing-microfrontends.md)
- [references/path-routing.md](references/path-routing.md)
- [references/security.md](references/security.md)
- [references/troubleshooting.md](references/troubleshooting.md)

## License

[Apache-2.0](LICENSE.txt) · [Copyright and adaptation notice](NOTICE).
