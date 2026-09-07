# Presentation authoring

Start with audience, purpose, duration and a slide outline. Use a supplied template's theme, layouts, typography and spacing. Read existing slide content, notes, shapes and charts before editing; avoid rebuilding the deck from text. Native editable shapes, tables and charts are preferred where they express the content accurately.

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
slide = prs.slides.add_slide(prs.slide_layouts[5])
slide.shapes.title.text = "Revenue grew across both periods"
data = CategoryChartData()
data.categories = ["Prior", "Current"]
data.add_series("Revenue", [100, 120])
slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED,
    Inches(1), Inches(1.6), Inches(10.8), Inches(4.8), data)
slide.notes_slide.notes_text_frame.text = "Source: supplied data; units: USD thousands."
prs.save(output_path)
```

Use real evidence and exact units, label estimates, and include source URLs in notes when supplied or verified. Use takeaway titles with a clear reading order; typically start around 28–36pt titles and 18–24pt body text. Split dense content across slides before shrinking it. Keep chart labels legible and scales honest. Use native tables for tabular data and real images for images; screenshots of text are not editable content.

python-pptx cannot faithfully recreate every SmartArt, animation, master, embedded object or special theme feature. For complex supplied decks, preserve the existing package and make targeted edits; use the native application when required. Do not claim a feature survived merely because saving succeeded.

## Render and inspect

Run `scripts/inspect-slides.py deck.pptx` for package relationships and top-level shape bounds. Review warnings (intentional full-bleed shapes can extend outside a slide). Group internals, text overflow, font substitution and visual overlap still require rendering.

Convert a copy using an available LibreOffice executable with a separate profile and bounded timeout:

```python
import os, subprocess, tempfile
from pathlib import Path
with tempfile.TemporaryDirectory() as profile:
    env = {**os.environ, "XDG_CACHE_HOME": profile, "XDG_CONFIG_HOME": profile}
    subprocess.run([soffice_path, "-env:UserInstallation=" + Path(profile).as_uri(),
        "--headless", "--convert-to", "pdf", "--outdir", str(qa_dir),
        str(Path(input_path).resolve())], check=True, timeout=120,
        capture_output=True, text=True, env=env)
assert (Path(qa_dir) / (Path(input_path).stem + ".pdf")).is_file()
```

Use a fresh QA directory; an old output must not masquerade as a successful conversion. Verify PDF page count equals slide count, render each page with view_pdf_page, and inspect every slide. Fix clipping, overlap, contrast, chart labels and crowded footnotes, then re-export. Deliver the editable PPTX; add PDF only if useful or requested. LibreOffice preview is not a guarantee of PowerPoint animation or font fidelity.
