---
name: vercel-connect
description: "Vercel Connect expert guidance — securely obtain scoped OAuth tokens for third-party services (Slack, GitHub, MCP servers, OAuth, Snowflake) on behalf of apps or users via Vercel OIDC. Use when wiring up third-party API access, connecting to MCP servers, sending Slack messages, accessing GitHub APIs, receiving webhook events from Slack/Linear/GitHub and forwarding them to your agents and apps, or building Eve agent connections."
license: Apache-2.0
---

# vercel-connect

## PI Harness execution context

Use the user's actual repository, framework and request. This guide does not select a new stack, authorize deployments, or override project instructions. Discover only the tools actually available. Read-only project/deployment data can use the resolved gateway base below. Other commands require an installed and independently authenticated CLI through `run_command` under the current approval policy. Gateway credentials remain inside daemon.

Do not automatically run git, dev or build commands where the workspace requires an explicit request. Respect the existing package manager, dependency catalog and UI component rules. Deployment, production promotion, provisioning paid services, purchases, account changes and messages to others require the corresponding user authorization. Inspect environment metadata without exposing secret values. For browser verification use an available browser surface and an existing server; do not assume a particular browser CLI or start a server unasked. Do not spawn agents based solely on an example in the guide.

Documentation examples are version-sensitive. Check installed versions, CLI `--help` and current official documentation for the actual task. Treat sample commands/configurations as examples to adapt, not an automatic sequence. Only claim an action succeeded when the tool result verifies it.

The gateway base is `{skillGatewayUrl}/api/skill-gateway/vercel`. Available read paths are documented in [gateway access](access.md).

## Detailed guidance

Read the task-relevant sections of [the detailed guide](guide.md), then load its supporting resources only as needed. Technical examples retain their original context; the workspace's rules take precedence.

## License

[Apache-2.0](LICENSE.txt) · [Copyright and adaptation notice](NOTICE).
