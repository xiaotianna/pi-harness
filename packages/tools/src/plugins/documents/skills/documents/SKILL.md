---
name: documents
description: Create, edit, review, redline, and comment on Word DOCX documents with style preservation and rendered page verification.
compatibility: Requires Python with python-docx and lxml; LibreOffice and Poppler for rendering
---

# Word documents

Use for DOCX authoring and edits, including a local DOCX intended for Google Docs. Work on a copy of an existing document. For questions only, read the relevant content and answer without saving a replacement.

## Environment and paths

Use the Skill directory returned by `load_skill` to resolve these resources. Run commands with `run_command`, working files and deliverables inside the workspace. Use absolute paths for this Skill's scripts. Keep QA files in a task-specific directory such as `.artifacts/<task>/qa/` and the requested document in `.artifacts/<task>/final/`.

Identify an existing Python executable with `python-docx`, `lxml`, and Pillow. Probe it with `-c 'import docx, lxml, PIL; import sys; print(sys.executable)'`. If system Python lacks them, check the project's `.venv/bin/python` or another configured Python environment. Use the verified absolute executable. The renderer discovers runtime LibreOffice when that runtime is selected; otherwise LibreOffice and Poppler must be on PATH. Install missing dependencies only through the current approval policy, using an isolated environment.

## Workflow

1. Read [authoring and layout](references/authoring.md). Determine the audience, requested document type, source facts and output format. A supplied template is the design authority.
2. Inspect an existing document using `read_document`, then its paragraphs, styles, tables, sections, headers and footers through `python-docx`. Render the source if layout must be preserved. Inspect the DOCX package before choosing an editor when it contains comments, tracked changes, fields or embedded objects.
3. Create or edit with `python-docx` for ordinary prose/tables. Preserve run formatting during targeted edits; assigning an entire paragraph's `.text` removes run-level formatting and links. For actual Word revisions or comments, read [OOXML editing](references/revisions-comments.md).
4. Use semantic Title and Heading styles, deliberate page dimensions and margins, and real editable tables. Apply a font available in the rendering environment, including an East Asian font for Chinese text. User/template choices take precedence over defaults.
5. Run the bundled renderer with the verified Python:
   ```text
   <python> <skill-directory>/scripts/render-docx.py <output.docx> --output_dir <qa-directory> --emit_pdf
   ```
   Use a fresh QA directory per version. Set `run_command.timeoutMs` appropriately for document length, up to its supported limit.
6. Inspect every latest `page-N.png` with `view_image`. Check clipping, missing glyphs, crowded tables, page breaks, headings stranded at page bottoms, headers/footers and page numbers. Fix and render again. Text/XML checks alone do not establish visual correctness.
7. Reopen the saved DOCX; verify requested text and native features. Comments and redlines require structural checks even if the pages look correct. Deliver the final DOCX with a file link. QA PDFs/PNGs remain internal unless requested.

For Google Docs, deliver a verified DOCX for import unless an authenticated native import action is actually available. Do not claim that a local file has been uploaded. If rendering is unavailable, identify the missing dependency and clearly distinguish the produced file from a visually verified result.

## Advanced local operations

For advanced edits, template preservation and format-specific validation, read [advanced workflow](references/advanced-editing.md). Read only the sections relevant to the task.

## Dependency setup

If the verified interpreter lacks required modules, create an isolated environment inside the workspace with `python3 -m venv .artifacts/document-runtime` and install this Skill's `requirements.txt` using that environment's `python -m pip install -r <skill-directory>/requirements.txt`, subject to the current command approval policy. Reuse the verified environment for subsequent calls. LibreOffice and Poppler are native dependencies: locate existing executables first; if absent, install through the platform package manager under the current policy and verify `soffice --version` and `pdftoppm -v`. Never treat missing dependencies as a successful render/recalculation.
