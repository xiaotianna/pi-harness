# Workbook authoring and verification

Inspect sheet names, dimensions, hidden rows/sheets, tables, named ranges, formulas, styles, validations, conditional formatting, charts, print settings and links before modifying an existing workbook. Load once with `data_only=False` for editing and separately with `data_only=True` for inspecting caches. Never save the data-only copy: formulas would be lost.

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo
wb = Workbook()
ws = wb.active
ws.title = "Sales"
ws.append(["Item", "Quantity", "Unit price", "Revenue"])
ws.append(["Example", 3, 12.5, "=B2*C2"])
ws.append(["Total", None, None, "=SUM(D2:D2)"])
for cell in ws[1]:
    cell.font = Font(bold=True)
for row in ws.iter_rows(min_row=2, min_col=3, max_col=4):
    for cell in row:
        cell.number_format = '#,##0.00;[Red](#,##0.00);–'
ws.freeze_panes = "B2"
for column, width in [("A", 24), ("B", 14), ("C", 16), ("D", 18)]:
    ws.column_dimensions[column].width = width
wb.save(output_path)
```

Store dates as dates, percentages as fractional numbers, and identifiers such as postal codes as strings. Use formulas for derived values. Use English formula names and commas in XLSX formulas. Choose `$A$1`, `A$1`, `$A1` and `A1` intentionally when copying formulas. Do not silently convert missing observations to zero or use IFERROR to conceal a broken model. Validate input ranges and label units/assumptions. Preserve established styling; otherwise use restrained header/input/result distinctions and appropriate numeric formats.

openpyxl does not calculate formulas. Recalculate with LibreOffice (or native Excel if available) into a **different, fresh directory**:

```python
import os, subprocess, tempfile
from pathlib import Path
with tempfile.TemporaryDirectory() as profile:
    env = {**os.environ, "XDG_CACHE_HOME": profile, "XDG_CONFIG_HOME": profile}
    subprocess.run([soffice_path, "-env:UserInstallation=" + Path(profile).as_uri(),
        "--headless", "--convert-to", "xlsx", "--outdir", str(recalc_dir),
        str(Path(input_path).resolve())], check=True, timeout=120,
        capture_output=True, text=True, env=env)
recalculated = Path(recalc_dir) / Path(input_path).name
assert recalculated.is_file()
```

This route is for ordinary XLSX. Do not convert macro-enabled or feature-sensitive workbooks through XLSX; preserve VBA with keep_vba and use the target application when necessary. LibreOffice may change Excel-specific features and cannot prove native Excel compatibility.

Run `check-workbook.py recalculated.xlsx --require-cached --expect expected.json`. Example expected JSON: `{"Sales!D2": 37.5, "Sales!D3": 37.5}`. Derive expected values independently, not by copying workbook caches. Verify totals, first/middle/last rows, blanks, zeros and boundary inputs. Change representative inputs in a disposable copy, recalculate again and confirm dependent results and charts change. Missing caches (including a legitimately blank formula result) require inspection; formula strings alone are insufficient evidence.

For visual QA, convert to PDF with the same isolated-profile procedure, replacing `xlsx` with `pdf`. Preserve the delivered workbook's print settings; adjust a separate QA copy's print areas/orientation for sheets intended for screen use. Inspect all affected sheets for clipped labels, `####`, tiny text, bad page breaks and chart ranges. Reopen final formulas and cached values after the last save. Clearly report unsupported formulas, unavailable recalculation or native features that could not be verified.
