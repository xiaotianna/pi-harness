---
name: presentations
description: Create, edit, inspect, render, and verify PPT and PPTX presentation slide decks.
---

# Presentations

Use this Skill when the requested input or deliverable is a presentation, slide deck, PowerPoint, PPT, or PPTX file.

- Read existing decks with `read_document` and preserve the supplied theme, masters, layouts, slide order, notes, links, charts, and editable content unless the user asks to change them.
- Create or edit decks with the smallest available local toolchain. Use `run_command` only inside the workspace, check dependencies first, and do not install packages without approval.
- Give each slide one clear purpose. Use direct titles, concise copy, strong hierarchy, readable type, and layouts that fit the audience and content.
- Keep required tables, charts, diagrams, and evidence editable. Preserve source units, labels, citations, and uncertainty; do not invent facts or decorative data.
- Prefer a coherent composition over dense grids of cards. Use visuals only when they materially improve comprehension.
- Export and render every slide after editing, inspect the slide images with `view_image`, and fix overlap, overflow, clipping, missing assets, low contrast, and awkward alignment before delivery.
- Return only the requested final deck unless the user asks for render previews or QA artifacts.

If the available local tools cannot preserve a requested native presentation feature, explain the limitation instead of silently flattening or dropping it.
