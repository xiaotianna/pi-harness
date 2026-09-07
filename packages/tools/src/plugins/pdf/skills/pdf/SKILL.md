---
name: pdf
description: Read, create, inspect, render, and verify PDF files where visual layout matters, including fillable forms.
---

# PDF

Use this Skill when the source or requested deliverable is a PDF and layout fidelity matters.

- Use `read_document` for bounded text extraction and `view_pdf_page` to inspect page layout, images, tables, and typography. Do not treat extracted text as proof that the visual result is correct.
- Create or edit PDFs with the smallest available local toolchain. Use `run_command` only inside the workspace, check dependencies first, and do not install packages without approval.
- Preserve page size, margins, fonts, metadata, links, bookmarks, and form behavior when they are part of the request.
- For fillable forms, keep fields interactive unless the user explicitly asks for a flattened result. Verify both the form field values and their visible appearance.
- Render and inspect every affected page after a meaningful change. Fix clipping, overlap, missing glyphs, illegible text, and broken page flow before delivery.
- Return only the requested final PDF unless the user asks for extracted text or QA artifacts.

If a requested edit would invalidate a signature or cannot be preserved safely, stop and explain the limitation.
