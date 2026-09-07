# Templates, layout and quantitative evidence

For template work, inventory slide size, theme fonts/colors, masters, layouts, notes, native charts/tables, images and any embedded workbooks. Open the source with python-pptx and modify a copy; use actual template layouts rather than approximating them on blank slides. Preserve untouched slides and native package parts. Before replacing unsupported objects, choose a native application workflow or report exactly what cannot be preserved.

Run `inspect-slides.py output.pptx --reference template.pptx`. The reference check compares slide dimensions and theme/master/layout parts; differences require review, not automatic rejection, because requested changes may legitimately affect them. This is structural evidence, not complete visual fidelity. Render the source and output with the same engine and compare affected slides at equal resolution. Check brand assets, alignment, margins, type scale, contrast, page numbers and footer placement. Inspect every slide after the last edit.

Use one takeaway per slide. Titles should state a supported conclusion. Preserve units, denominator, date range and sources; label forecasts and estimates. Keep a stable visual grammar across repeated slide types. For title slides choose imagery that supports the actual topic, with a quiet area for readable text. A decorative diagram must not look like measured evidence.

For charts prefer native editable charts and embedded data workbooks. Check category/value counts, series names, units, axes, scale, percent conversion, title and legend. Verify rendered values against the supplied source. Avoid 3D charts that distort comparisons. Do not turn quantitative data into an unlabeled shape diagram. For financial evidence reconcile totals and subtotals independently, distinguish actual/forecast periods, and explain changes in definitions.

For native table arithmetic, prepare independent expectations in JSON and use `--expect-tables`: `[{"slide":1,"shape":"Table 2","row":1,"column":1,"text":"37.5"}]`. Slide indices are one-based, row/column indices zero-based. Expected text is checked exactly after save. Compute business totals independently before constructing the JSON. Do not infer sums from display strings with unknown units or locale.

Template edit checklist: preserve notes, speaker citations, relationships and media; inspect overlapping text, bullet levels, group transforms and font substitution visually. Package checks cannot determine text overflow. Use native PowerPoint for animation/SmartArt fidelity when available; a static LibreOffice PDF cannot establish animation correctness.

Create a contact sheet from rendered slides using Pillow thumbnails for sequence review, but also inspect full-resolution pages for fine text. A visual diff highlights changes and does not determine whether the changes are correct. Keep QA images outside the final deliverables unless requested.
