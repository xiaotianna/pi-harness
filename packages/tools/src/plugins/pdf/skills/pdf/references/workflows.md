# PDF workflows

Use ReportLab Platypus for flowing prose and tables:

```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
styles = getSampleStyleSheet()
rows = [["Item", "Value"], ["Example", "42"]]
table = Table(rows, repeatRows=1, hAlign="LEFT")
table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
                          ("VALIGN", (0,0), (-1,-1), "TOP"),
                          ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
SimpleDocTemplate(output_path).build([
    Paragraph("Report", styles["Title"]), Spacer(1, 12), table])
```

Register an installed embeddable font with glyph coverage for non-Latin content; use Paragraph objects in long table cells so they wrap. Escape user text before treating it as Paragraph markup. For page merging and rotation use pypdf and preserve bookmarks/metadata deliberately. Extraction order may differ from visual reading order; verify tables, columns and scans against page images.

## Forms

`pdf-forms.py` handles ordinary AcroForm text and button fields. Inspect names, types and button export values before constructing JSON. The helper refuses signed, orphan or ambiguous forms instead of guessing a repair; XFA and multi-select fields need a dedicated workflow.

Canonical `/AcroForm/Fields` and page `/Widget` annotations are distinct: a visible widget alone is not proof of a valid form. Follow `/Parent` chains for the full field name and effective value. Check `/Kids` relationships when diagnosing malformed documents. For a genuinely orphaned widget with a unique name, pypdf's `reattach_fields()` can repair a disposable copy; inspect the resulting canonical graph before filling. Same-name detached objects require explicit graph repair, not blind reattachment or name matching.

Fill using `clone_document_from_reader`, update all pages with `auto_regenerate=False`, and reopen the saved file. Verify canonical values, widget states and normal appearance streams. Buttons require an export state actually present in `/AP/N`. An appearance stream's existence is only structural evidence: render every affected page to check the displayed values.

Flatten only when explicitly requested. Generate field appearances before removing widgets and the AcroForm dictionary. Verify no widgets/form dictionary remain and render to ensure values survived. Flattening is irreversible in the output copy. Digital signatures are invalidated by rewriting; obtain the user's decision before modifying a signed source.

Use `view_pdf_page` or `pdftoppm -scale-to 1800 -png output.pdf <qa-prefix>` for visual review. For encrypted documents request the password through an appropriate local workflow; do not print it in logs. Keep source files intact.
