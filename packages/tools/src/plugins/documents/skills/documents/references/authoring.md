# Word authoring

Inspect existing styles, sections, headers/footers, tables, images and page breaks before editing. A supplied template is authoritative. Use python-docx for supported edits; keep unsupported OOXML parts intact rather than recreating the document from text.

```python
from docx import Document
from docx.shared import Cm, Pt
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

doc = Document()  # Or Document(source_path)
section = doc.sections[0]
section.page_width, section.page_height = Cm(21), Cm(29.7)
section.top_margin = section.bottom_margin = Cm(2)
section.left_margin = section.right_margin = Cm(2.2)
normal = doc.styles["Normal"]
normal.font.name = "Arial"
normal.font.size = Pt(11)
normal.element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "Noto Sans CJK SC")
normal.paragraph_format.space_after = Pt(6)
for name in ("Heading 1", "Heading 2"):
    doc.styles[name].paragraph_format.keep_with_next = True
doc.add_heading("Report", 0)
doc.add_heading("Results", 1)
doc.add_paragraph("Explain the result and its evidence.")
table = doc.add_table(rows=1, cols=2)
table.style = "Table Grid"
table.rows[0].cells[0].text = "Item"
table.rows[0].cells[1].text = "Value"
repeat = OxmlElement("w:tblHeader")
table.rows[0]._tr.get_or_add_trPr().append(repeat)
for label, value in [("Example", "42")]:
    cells = table.add_row().cells
    cells[0].text, cells[1].text = label, value
doc.save(output_path)
```

Confirm fonts actually exist (including CJK glyph coverage); font names alone do not install them. Use semantic headings and genuine numbered/bulleted lists, not typed bullet characters. Set table grid and cell widths consistently within the available page width, allow rows to grow, and add cell padding when needed. Avoid exact row heights that clip content. Repeat header rows for long tables; do not force an entire multi-page table to stay together.

Edit individual runs when preserving mixed formatting. Assigning `paragraph.text` replaces its runs and can remove links and formatting. Do not append whitespace or empty paragraphs to position content. Use paragraph spacing, indents, page breaks and section settings instead. Preserve fields such as page numbers rather than replacing them with literal values.

Render using `scripts/render-docx.py input.docx --output_dir <workspace-qa-dir> --emit_pdf`. This requires LibreOffice and Poppler; it uses a temporary isolated LibreOffice profile. Inspect every page with view_image, fix overflow, blank pages, split headings, tables and missing glyphs, then render again. Reopen the final DOCX to verify text, headings and native tables. Rendering proves appearance in that renderer, not identical behavior in every Word version.
