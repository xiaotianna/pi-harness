---
name: documents
description: Create, edit, review, and verify DOCX and Word documents, including documents intended for Google Docs.
---

# Documents

Use this Skill when the requested deliverable is a document, Word file, DOCX, memo, report, or Google Docs-ready file.

- Read existing files with `read_document`. Preserve the supplied structure, wording, styles, headers, footers, tables, links, comments, and tracked changes unless the user asks to alter them.
- Create or edit the document with the smallest available local toolchain. Use `run_command` only inside the workspace, check that required programs or libraries exist first, and do not install dependencies without approval.
- Keep titles descriptive, lead with the conclusion or requested action, and use connected prose instead of decorative filler.
- Prefer built-in document styles and editable tables. Keep headings, spacing, margins, page breaks, and table widths consistent.
- After creating or editing a DOCX, render it to page images with an available local renderer, inspect every page with `view_image`, and fix clipping, overlap, broken tables, missing glyphs, or awkward page breaks before delivery.
- Return only the requested final document unless the user asks for QA artifacts.

If the available local tools cannot safely preserve or create the requested feature, explain the limitation instead of claiming success.
