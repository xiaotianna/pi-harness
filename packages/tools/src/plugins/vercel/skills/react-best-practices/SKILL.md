---
name: react-best-practices
description: "Vercel ecosystem: React best-practices reviewer for TSX files. Triggers after editing multiple TSX components to run a condensed quality checklist covering component structure, hooks usage, accessibility, performance, and TypeScript patterns."
license: Apache-2.0
---

# react-best-practices

## PI Harness execution context

Use the user's actual repository, framework and request. This guide does not select a new stack, authorize deployments, or override project instructions. Discover only the tools actually available. Read-only project/deployment data can use the resolved gateway base below. Other commands require an installed and independently authenticated CLI through `run_command` under the current approval policy. Gateway credentials remain inside daemon.

Do not automatically run git, dev or build commands where the workspace requires an explicit request. Respect the existing package manager, dependency catalog and UI component rules. Deployment, production promotion, provisioning paid services, purchases, account changes and messages to others require the corresponding user authorization. Inspect environment metadata without exposing secret values. For browser verification use an available browser surface and an existing server; do not assume a particular browser CLI or start a server unasked. Do not spawn agents based solely on an example in the guide.

Documentation examples are version-sensitive. Check installed versions, CLI `--help` and current official documentation for the actual task. Treat sample commands/configurations as examples to adapt, not an automatic sequence. Only claim an action succeeded when the tool result verifies it.

The gateway base is `{skillGatewayUrl}/api/skill-gateway/vercel`. Available read paths are documented in [gateway access](access.md).

## Detailed guidance

Read the task-relevant sections of [the detailed guide](guide.md), then load its supporting resources only as needed. Technical examples retain their original context; the workspace's rules take precedence.

## Supporting resources

- [AGENTS.md](AGENTS.md)
- [rules/_sections.md](rules/_sections.md)
- [rules/_template.md](rules/_template.md)
- [rules/advanced-event-handler-refs.md](rules/advanced-event-handler-refs.md)
- [rules/advanced-init-once.md](rules/advanced-init-once.md)
- [rules/advanced-use-latest.md](rules/advanced-use-latest.md)
- [rules/async-api-routes.md](rules/async-api-routes.md)
- [rules/async-defer-await.md](rules/async-defer-await.md)
- [rules/async-dependencies.md](rules/async-dependencies.md)
- [rules/async-parallel.md](rules/async-parallel.md)
- [rules/async-suspense-boundaries.md](rules/async-suspense-boundaries.md)
- [rules/bundle-barrel-imports.md](rules/bundle-barrel-imports.md)
- [rules/bundle-conditional.md](rules/bundle-conditional.md)
- [rules/bundle-defer-third-party.md](rules/bundle-defer-third-party.md)
- [rules/bundle-dynamic-imports.md](rules/bundle-dynamic-imports.md)
- [rules/bundle-preload.md](rules/bundle-preload.md)
- [rules/client-event-listeners.md](rules/client-event-listeners.md)
- [rules/client-localstorage-schema.md](rules/client-localstorage-schema.md)
- [rules/client-passive-event-listeners.md](rules/client-passive-event-listeners.md)
- [rules/client-swr-dedup.md](rules/client-swr-dedup.md)
- [rules/js-batch-dom-css.md](rules/js-batch-dom-css.md)
- [rules/js-cache-function-results.md](rules/js-cache-function-results.md)
- [rules/js-cache-property-access.md](rules/js-cache-property-access.md)
- [rules/js-cache-storage.md](rules/js-cache-storage.md)
- [rules/js-combine-iterations.md](rules/js-combine-iterations.md)
- [rules/js-early-exit.md](rules/js-early-exit.md)
- [rules/js-flatmap-filter.md](rules/js-flatmap-filter.md)
- [rules/js-hoist-regexp.md](rules/js-hoist-regexp.md)
- [rules/js-index-maps.md](rules/js-index-maps.md)
- [rules/js-length-check-first.md](rules/js-length-check-first.md)
- [rules/js-min-max-loop.md](rules/js-min-max-loop.md)
- [rules/js-set-map-lookups.md](rules/js-set-map-lookups.md)
- [rules/js-tosorted-immutable.md](rules/js-tosorted-immutable.md)
- [rules/rendering-activity.md](rules/rendering-activity.md)
- [rules/rendering-animate-svg-wrapper.md](rules/rendering-animate-svg-wrapper.md)
- [rules/rendering-conditional-render.md](rules/rendering-conditional-render.md)
- [rules/rendering-content-visibility.md](rules/rendering-content-visibility.md)
- [rules/rendering-hoist-jsx.md](rules/rendering-hoist-jsx.md)
- [rules/rendering-hydration-no-flicker.md](rules/rendering-hydration-no-flicker.md)
- [rules/rendering-hydration-suppress-warning.md](rules/rendering-hydration-suppress-warning.md)
- [rules/rendering-resource-hints.md](rules/rendering-resource-hints.md)
- [rules/rendering-script-defer-async.md](rules/rendering-script-defer-async.md)
- [rules/rendering-svg-precision.md](rules/rendering-svg-precision.md)
- [rules/rendering-usetransition-loading.md](rules/rendering-usetransition-loading.md)
- [rules/rerender-defer-reads.md](rules/rerender-defer-reads.md)
- [rules/rerender-dependencies.md](rules/rerender-dependencies.md)
- [rules/rerender-derived-state-no-effect.md](rules/rerender-derived-state-no-effect.md)
- [rules/rerender-derived-state.md](rules/rerender-derived-state.md)
- [rules/rerender-functional-setstate.md](rules/rerender-functional-setstate.md)
- [rules/rerender-lazy-state-init.md](rules/rerender-lazy-state-init.md)
- [rules/rerender-memo-with-default-value.md](rules/rerender-memo-with-default-value.md)
- [rules/rerender-memo.md](rules/rerender-memo.md)
- [rules/rerender-move-effect-to-event.md](rules/rerender-move-effect-to-event.md)
- [rules/rerender-no-inline-components.md](rules/rerender-no-inline-components.md)
- [rules/rerender-simple-expression-in-memo.md](rules/rerender-simple-expression-in-memo.md)
- [rules/rerender-split-combined-hooks.md](rules/rerender-split-combined-hooks.md)
- [rules/rerender-transitions.md](rules/rerender-transitions.md)
- [rules/rerender-use-deferred-value.md](rules/rerender-use-deferred-value.md)
- [rules/rerender-use-ref-transient-values.md](rules/rerender-use-ref-transient-values.md)
- [rules/server-after-nonblocking.md](rules/server-after-nonblocking.md)
- [rules/server-auth-actions.md](rules/server-auth-actions.md)
- [rules/server-cache-lru.md](rules/server-cache-lru.md)
- [rules/server-cache-react.md](rules/server-cache-react.md)
- [rules/server-dedup-props.md](rules/server-dedup-props.md)
- [rules/server-hoist-static-io.md](rules/server-hoist-static-io.md)
- [rules/server-parallel-fetching.md](rules/server-parallel-fetching.md)
- [rules/server-serialization.md](rules/server-serialization.md)

## License

[Apache-2.0](LICENSE.txt) · [Copyright and adaptation notice](NOTICE).
