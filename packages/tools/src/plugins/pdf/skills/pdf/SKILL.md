---
name: pdf
description: Read, create, edit, and visually verify PDF documents, including interactive form fields and their saved appearance.
compatibility: Requires Python with reportlab and pypdf; PDF viewing uses PI Harness view_pdf_page
---

# PDF

Use `read_document` for text and `view_pdf_page` for layout, diagrams, tables and scans. Text extraction does not establish visual correctness. For read-only questions, inspect and cite the relevant pages without rewriting the file.

## Local setup

Resolve resources against the Skill directory from `load_skill`. Keep source files intact and write outputs inside the workspace, for example `.artifacts/<task>/final/`; use `.artifacts/<task>/qa/` for scratch files.

Verify a Python executable with `-c 'import reportlab, pypdf; import sys; print(sys.executable)'`; add `pdfplumber` when table extraction needs it. Check project `.venv/bin/python` or another configured Python environment if system Python lacks modules. Use the verified absolute executable in `run_command`. Dependencies remain subject to the current approval policy.

## Create and edit

- Read [PDF workflows](references/workflows.md) before authoring. Prefer ReportLab flowables for multi-page prose and tables; use canvas only for deliberate fixed layouts. Choose page size, margins and fonts before placing content.
- Use pypdf for page operations and metadata/forms. Preserve requested page order, rotation, bookmarks and interactive features. Work from the complete source document instead of rebuilding it from extracted text.
- For scanned PDFs, inspect the image first. Use OCR only when an installed OCR engine is available and verify uncertain text against the scan. Do not invent unreadable text.
- For interactive forms, inspect canonical fields and page widgets before filling. Use the bundled helper:
  ```text
  <python> <skill-directory>/scripts/pdf-forms.py inspect <source.pdf>
  <python> <skill-directory>/scripts/pdf-forms.py fill <source.pdf> <values.json> <output.pdf>
  <python> <skill-directory>/scripts/pdf-forms.py verify <output.pdf> <values.json>
  ```
  JSON maps full field names to strings; checkbox/radio values use their actual export names such as `/Yes` or `/Off`. See the reference for orphan widgets and ambiguous names. Keep forms interactive; add `--flatten` only when the user requests a static result. Signed files require an explicit decision because modification invalidates signatures.

## Verification and delivery

Reopen the final PDF and verify page count, expected text and requested structural features. For forms, verify both `/AcroForm/Fields` values and widget appearance streams; the helper does this structural check. Then inspect every created or affected page with `view_pdf_page`, or render using `pdftoppm -scale-to 1800 -png <pdf> <qa-prefix>` and inspect PNGs. Check fonts, clipped labels, tables, visual field values and pagination. Re-render after fixes.

Deliver the requested final PDF with a file link. Do not report structural or visual validation that was unavailable. A successful export alone does not establish a correct document.

## Advanced local operations

For advanced edits, template preservation and format-specific validation, read [advanced workflow](references/advanced-forms.md). Read only the sections relevant to the task.

## Dependency setup

If the verified interpreter lacks required modules, create an isolated environment inside the workspace with `python3 -m venv .artifacts/document-runtime` and install this Skill's `requirements.txt` using that environment's `python -m pip install -r <skill-directory>/requirements.txt`, subject to the current command approval policy. Reuse the verified environment for subsequent calls. LibreOffice and Poppler are native dependencies: locate existing executables first; if absent, install through the platform package manager under the current policy and verify `soffice --version` and `pdftoppm -v`. Never treat missing dependencies as a successful render/recalculation.
