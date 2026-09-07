---
name: presentations
description: Create and edit editable PPTX slide decks with template preservation, native charts and tables, and per-slide visual verification.
compatibility: Requires Python with python-pptx; LibreOffice for PDF previews
---

# Presentations

For questions about a deck, inspect it without editing. For a new deck, establish audience, purpose, required facts and any template before authoring. Follow explicit slide counts and ordering. A deck supplied only as a source of facts does not automatically define the new design.

## Environment

Use `run_command` for local authoring, `read_document` for text, and `view_pdf_page` or `view_image` for visual review. Keep source decks intact. Store the requested PPTX in `.artifacts/<task>/final/` and QA outputs separately inside the workspace. Resolve scripts relative to the Skill directory from `load_skill`.

Verify an existing Python with `-c 'import pptx; import sys; print(sys.executable)'`. If needed, check project `.venv/bin/python` or another configured Python environment. Use that absolute executable. Find `soffice` on PATH or the selected runtime's `dependencies/bin/override/soffice`; on macOS an installed LibreOffice may be under `/Applications/LibreOffice.app/Contents/MacOS/soffice`. Follow current approvals for missing dependencies.

## Authoring

1. Read [design and authoring](references/authoring.md). For an existing deck, render the relevant source slides and inspect slide size, placeholders, masters, theme, fonts, logos and crops. Edit the source copy in place; change a master only if all affected slides should change.
2. Use `python-pptx` for supported native text, images, tables and charts. Inspect unsupported native features before saving an existing file; for complex templates, use targeted OOXML edits instead of reconstructing the deck. Reopening a deck is not proof that every native feature survived.
3. Give each slide a clear subject and one main purpose. Use factual titles, concise wording, aligned content and enough whitespace. Preserve required evidence and editable objects. Split content or adjust layout before reducing type below readable sizes.
4. Keep charts and tables native. Match source categories, series, signs, units and date periods. Calculate totals from source values. Add actual sources to speaker notes; keep disclosures visible when the audience needs them. Use supplied visual assets without distorting proportions.
5. Run package and geometry checks:
   ```text
   <python> <skill-directory>/scripts/inspect-slides.py <output.pptx>
   ```
   Review every reported off-slide object and missing relationship. Bounds do not detect text overflow or establish visual fidelity.
6. Convert the finished deck to a PDF using the isolated LibreOffice command in the reference. Verify slide/page counts, inspect every page, fix overlaps, clipping, tiny text, blank charts and missing assets, then repeat affected checks.
7. Reopen the PPTX and verify requested notes, chart series and tables. Deliver the editable PPTX with a file link. PDF/PNG previews are QA assets unless requested.

A Google Slides result requires an available authenticated upload/import action. A local PPTX is a local deliverable, not a completed cloud presentation. Disclose target-application checks that could not be performed.

## Advanced local operations

For advanced edits, template preservation and format-specific validation, read [advanced workflow](references/advanced-workflows.md). Read only the sections relevant to the task.

## Dependency setup

If the verified interpreter lacks required modules, create an isolated environment inside the workspace with `python3 -m venv .artifacts/document-runtime` and install this Skill's `requirements.txt` using that environment's `python -m pip install -r <skill-directory>/requirements.txt`, subject to the current command approval policy. Reuse the verified environment for subsequent calls. LibreOffice and Poppler are native dependencies: locate existing executables first; if absent, install through the platform package manager under the current policy and verify `soffice --version` and `pdftoppm -v`. Never treat missing dependencies as a successful render/recalculation.
