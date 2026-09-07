# Advanced Word operations

First run `scripts/audit-docx.py source.docx`. Paragraph indices refer only to top-level body paragraphs, in the original document order. Save all edits to a new output file. Use `scripts/edit-docx.py source.docx operations.json output.docx`; operations are applied in order and invalid requests stop before writing.

Example operations (choose only those requested):
```json
[
  {"op":"tracked-replace","paragraph":0,"old":"draft","new":"approved","author":"Reviewer"},
  {"op":"comment","paragraph":0,"text":"Please verify the date.","author":"Reviewer"},
  {"op":"bookmark","paragraph":0,"name":"Summary"},
  {"op":"cross-reference","paragraph":1,"bookmark":"Summary"},
  {"op":"caption","paragraph":1,"label":"Figure"},
  {"op":"footnote","paragraph":1,"text":"Source details"},
  {"op":"endnote","paragraph":1,"text":"Additional context"},
  {"op":"toc","paragraph":2},
  {"op":"content-control","paragraph":3,"tag":"CustomerName"}
]
```

`accept-revisions` and `reject-revisions` process ordinary inserted/deleted paragraph runs. Complex property changes and moved content stop for a native review workflow. `tracked-replace` deliberately requires a unique plain-run match: for split runs, inspect run XML and preserve formatting when constructing the replacement. Do not silently replace the entire paragraph. Comments anchor the whole paragraph; partial-range comments require splitting the boundary runs first.

TOC, REF and SEQ insert genuine Word fields, with dirty flags. They require field updating in Word or LibreOffice before delivery; the placeholder is not a computed result. Check bookmark uniqueness and numbering after an update. Equations use native OMML (`m:oMath`) inside a run; preserve existing math XML, and validate in Word/LibreOffice rather than converting equations into screenshots.

Use `{"op":"remove-comments"}` to remove conventional and extended comment parts with their anchors. For manual batch removal, remove the comment parts and their content-type/relationship entries as well as all range/reference elements in every affected story (headers, footers, body). For anonymization, `scrub-metadata` removes common core author metadata and replaces review author names; this is **not full redaction**. Search document text, deleted text, comments, headers, footers, custom XML, embedded objects, filenames and image metadata for each sensitive value. Remove hidden/embedded copies explicitly and inspect the unzipped output. A black rectangle does not remove underlying text.

## Templates, sections, tables and merging

Use `Document(template_path)` and edit supported objects in place. Map styles by semantic role, not visual resemblance; preserve numbering definitions and section header/footer relationships. Audit page dimensions, margins, section starts, first-page and odd/even headers. Never replace all styles in a supplied template.

For native tables, keep table grid widths and cell widths consistent; use repeating header rows and avoid fixed heights. Read spreadsheets with openpyxl in formula and cached modes before importing values; report uncalculated caches rather than inserting blanks as verified results. Export DOCX tables with csv.writer, including merged-cell meaning explicitly.

Run `scripts/compose-docx.py output.docx first.docx second.docx` for document merging. The helper uses the established `docxcompose` library (install through the dependency workflow) rather than appending raw body XML, which loses numbering/media relationships:
```python
from docx import Document
from docxcompose.composer import Composer
composer = Composer(Document(first_path))
composer.append(Document(second_path))
composer.save(output_path)
```
Check headers/footers, section boundaries and numbering after merging; the first document's header/footer behavior may become authoritative. Resolve incompatible templates explicitly.

Use python-docx styles for normalization and audit headings for skipped levels, duplicate numbering and orphan headings. For accessibility check semantic headings, table header meaning, reading order, link text and image alternative text. The audit reports candidate issues; it is not a certification.

For watermarks/backgrounds inspect VML and DrawingML objects in header parts, not just body text. Remove only the identified watermark object; preserve shared images and relationships used elsewhere. To add one use a dedicated header object with deliberate positioning and transparency, then inspect every section. Editing restriction (`w:documentProtection`) is distinct from file encryption; do not advertise it as confidentiality protection. Preserve an existing restriction unless the user authorizes its removal.

Render source and output with identical DPI. Run `scripts/compare-pages.py before-dir after-dir new-diff-dir` and inspect changed pages, then rerun the structural audit. Inspect fields and review markup separately from the rendered final-text view.
