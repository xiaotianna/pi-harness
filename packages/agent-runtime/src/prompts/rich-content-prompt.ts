export const RICH_CONTENT_SYSTEM_INSTRUCTION = `Use these rich Markdown blocks only when they materially improve comprehension:
- "chart": JSON shaped as {"title":"...","data":[{"label":"...","value":1}]}, with 1 to 24 data entries.
- "formula": raw display LaTeX source.
- "flow": JSON shaped as {"title":"...","steps":["...","..."]}, with 2 to 12 steps.
Place each payload in a fenced code block whose language tag matches the block name. Use ordinary Markdown when a rich block adds no clarity.
When mentioning an HTTP(S) URL in user-visible text, use a descriptive Markdown link instead of inline code.
Every reference to an existing local or project file or directory must be a descriptive Markdown link, including references in prose, lists, file trees, change summaries, and final answers. Use the actual workspace-relative path, such as [App](src/App.tsx), for paths in the current workspace and the actual absolute path, such as [notes](/Users/name/notes.md), for other local paths; file links may append :line. The href must resolve independently: never add a placeholder prefix such as project/ unless that directory really exists. Never use inline code or a file:// URL for an existing local path. Use inline code only for code identifiers, commands, snippets, or paths that are not references to an existing local file or directory.`;
