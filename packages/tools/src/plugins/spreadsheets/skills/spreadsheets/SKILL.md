---
name: spreadsheets
description: Create, edit, analyze, and verify XLSX, CSV and TSV workbooks with typed data, live formulas, recalculation and visual review.
compatibility: Requires Python with openpyxl; LibreOffice or Excel for actual formula recalculation
---

# Spreadsheets

For read-only questions, inspect the source and answer without exporting a replacement. For edits, preserve existing sheet structure, formulas, styles, validation, named ranges, charts and hidden content outside the requested change.

## Environment and output

Use `run_command` with a verified Python: `-c 'import openpyxl; import sys; print(sys.executable)'`. If needed, check project `.venv/bin/python` or another configured Python environment. Use that absolute executable. Locate LibreOffice on PATH or in the selected runtime's `dependencies/bin/override/soffice`. Install missing dependencies only through current approval policy.

Resolve these references/scripts from the Skill directory returned by `load_skill`. Keep original inputs intact, write the final workbook inside the workspace, and use task-specific QA directories. Do not add worksheets containing implementation notes or test data to the delivered workbook.

## Workflow

1. Read [workbook authoring and verification](references/workflows.md). Inspect the source in both formula and cached-value modes. Identify each row's meaning, units, dates and identifiers before calculating anything. CSV/TSV require explicit delimiter/encoding and preservation of identifier strings.
2. Use openpyxl for supported XLSX edits, standard `csv` for delimited text. It writes formulas but **does not calculate them**. Use `keep_vba=True` for an XLSM copy and inspect macros/unsupported features before choosing a save path. Convert legacy XLS only on a copy with an available office engine.
3. Preserve source data and derive results with formulas. Use typed numeric/date values and number formats. Keep editable assumptions clearly labeled; use relative/mixed/absolute references intentionally. Do not hide missing inputs as plausible zero results.
4. Keep the workbook as small as the task permits. Put the main result above relevant detail; separate source and build sheets only when useful. Source → assumptions/build → output is the business dependency direction. Check/Audit calculations must not feed business results.
5. Save to a new file, then perform actual recalculation using the reference's LibreOffice procedure or the available target application. Reopen the recalculated file with `data_only=True`; setting `fullCalcOnLoad` is not proof of calculated values.
6. Run the supplied checker after recalculation:
   ```text
   <python> <skill-directory>/scripts/check-workbook.py <recalculated.xlsx> --require-cached
   ```
   For independently known results, add `--expect <expected.json>` where JSON maps `Sheet!Cell` to expected values. Check representative first/middle/last rows, totals, input changes and boundary cases in a disposable copy. Confirm charts and statuses update with input changes.
7. Review every new or affected sheet visually. Use an office PDF preview and `view_pdf_page`; preserve source print settings and adjust only a QA copy if a screen-oriented sheet needs different print areas. Inspect for `####`, clipped labels, tiny text, broken charts and inappropriate page splitting.
8. Deliver the final recalculated workbook with a file link. Preserve unsupported native features or report a concrete limitation. Do not claim native Excel behavior from formula text or cached values alone.

## Advanced local operations

For advanced edits, template preservation and format-specific validation, read [advanced workflow](references/advanced-workflows.md). Read only the sections relevant to the task.

## Dependency setup

If the verified interpreter lacks required modules, create an isolated environment inside the workspace with `python3 -m venv .artifacts/document-runtime` and install this Skill's `requirements.txt` using that environment's `python -m pip install -r <skill-directory>/requirements.txt`, subject to the current command approval policy. Reuse the verified environment for subsequent calls. LibreOffice and Poppler are native dependencies: locate existing executables first; if absent, install through the platform package manager under the current policy and verify `soffice --version` and `pdftoppm -v`. Never treat missing dependencies as a successful render/recalculation.
