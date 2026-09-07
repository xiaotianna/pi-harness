---
name: spreadsheets
description: Create, edit, analyze, visualize, and verify XLSX, XLS, CSV, and TSV spreadsheet files.
---

# Spreadsheets

Use this Skill when the requested input or deliverable is a spreadsheet, workbook, sheet, XLSX, XLS, CSV, or TSV file.

- Inspect existing files before editing. Preserve formulas, number formats, dates, merged cells, validations, filters, hidden sheets, names, charts, and workbook structure unless the user asks to change them.
- Create or edit files with the smallest available local spreadsheet toolchain. Use `run_command` only inside the workspace, check dependencies first, and do not install packages without approval.
- Use formulas for derived values instead of hard-coded results. Keep formulas simple, avoid volatile functions unless required, and never invent missing source data.
- Make tables easy to scan with clear headers, appropriate column widths, consistent formats, frozen headers when useful, and accessible color contrast.
- Recalculate with an available spreadsheet engine when formulas change. Check for formula errors, missing values, truncated cells, unexpected text-as-number values, and broken references.
- Render or preview every changed sheet when layout matters, inspect the result with `view_image`, and fix visible defects before delivery.
- Return only the requested final workbook or delimited file unless the user asks for analysis or QA artifacts.

If recalculation or a requested native workbook feature is unavailable, disclose that limitation rather than presenting unchecked values as final.
