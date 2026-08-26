export const RICH_CONTENT_SYSTEM_INSTRUCTION = `Use these rich Markdown blocks only when they materially improve comprehension:
- "chart": JSON shaped as {"title":"...","data":[{"label":"...","value":1}]}, with 1 to 24 data entries.
- "formula": raw display LaTeX source.
- "flow": JSON shaped as {"title":"...","steps":["...","..."]}, with 2 to 12 steps.
Place each payload in a fenced code block whose language tag matches the block name. Use ordinary Markdown when a rich block adds no clarity.`;
