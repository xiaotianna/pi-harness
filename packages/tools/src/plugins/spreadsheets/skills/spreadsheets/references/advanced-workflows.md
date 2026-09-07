# Advanced local workbook workflows

## Templates and model structure

Inventory defined names, tables, validations, merged cells, protection, hidden sheets, external links, charts and conditional formatting before editing. Use `check-workbook.py input.xlsx --inventory` and retain this inventory for comparison. Preserve source formatting and print settings. Copy cell styles with copy.copy, preserve formulas in the edit copy, and use Translator for intentional relative formula movement. Check first/middle/last translated rows and mixed/absolute references.

Treat XLSM as a feature-sensitive format: load with keep_vba=True, preserve the extension and compare the VBA package entry before and after. openpyxl can remove unsupported extensions; if such a warning appears, stop and use the native application for that operation. Pivot refresh, slicers, external connections and dynamic-array behavior need native-engine checks. Do not save a data-only workbook.

## Charts and analysis

Use openpyxl.chart native chart objects with Reference ranges and explicit titles, axes and units. Charts must reference the intended source rows, including the final row and excluding totals when inappropriate. Check blanks, negative values, percent scaling and source expansion behavior. Set chart anchors away from the source table. Verify the rendered chart after recalculation and after a disposable input change.

Data tables for sensitivity analysis are different from formatted Excel tables. For a portable local model, compute a clearly labeled sensitivity grid by applying each input scenario to a disposable workbook and invoking the actual calculation engine; do not pretend cached values are a native What-If Data Table. Native What-If tables should be created/preserved through Excel. For new files, XlsxWriter supports native sparklines; existing-file edits must preserve their extension XML or use Excel. Validate their actual behavior in the target application before claiming support.

## Domain checks

Financial: document currency and scale, distinguish stock/flow measures and actual/forecast periods, retain source dates, reconcile cash-flow and balance-sheet identities, distinguish zero from unavailable values, and avoid summing ratios. Use consistent signs for costs and cash flows; compare forecasts with independent assumptions.

Scientific: retain units and significant figures, distinguish samples from replicates, document missing observations and exclusions, and use the correct error measure (SD/SE/CI). Do not change the statistical method to fit an attractive chart.

Healthcare: label observation time and denominators; preserve identifier strings and leading zeros, separate patient identifiers from analytical outputs when requested, and check population/time-window definitions before computing rates.

Marketing: keep platform, campaign, attribution window and timezone visible; aggregate weighted rates from numerator/denominator totals, not by averaging row percentages. Distinguish spend, attributed revenue and incremental revenue.

## Final verification

After native recalculation, run the checker with independent expected cells and require cached values. Inspect every changed worksheet and chart. Reopen final formulas/caches after the last save; a subsequent openpyxl save can discard calculated caches again. Compare inventories to identify unintended losses and report each unverifiable feature explicitly.

## Native sparklines for a new workbook

XlsxWriter creates new XLSX files; it does not edit existing ones. Use this route only for new workbooks requiring supported features such as sparklines:
```python
import xlsxwriter
with xlsxwriter.Workbook(output_path) as workbook:
    sheet = workbook.add_worksheet("Trend")
    sheet.write_row("A1", [10, 12, 9, 15])
    sheet.add_sparkline("E1", {"range": "Trend!A1:D1", "type": "line", "markers": True})
    sheet.write_formula("F1", "=SUM(A1:D1)", None, 46)
```
The formula's supplied cached value is only acceptable when independently calculated. Still verify recalculation in the target engine, and ensure a subsequent editor does not remove sparkline extensions. Review sparklines visually in an engine supporting them.
