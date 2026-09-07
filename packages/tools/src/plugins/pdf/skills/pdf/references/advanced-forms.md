# Complex PDF forms and page operations

Inspect before editing: canonical field tree, widget page, full name, field type, parent/kids, export states and appearances. Ordinary text/button fill uses pdf-forms.py. Choice fields can be filled with pypdf.update_page_form_field_values using a string (single choice) or string list (multi-select); validate values against /Opt and synchronize /I selected indices if required by the document. Test the saved file in a viewer and render affected pages. The ordinary helper intentionally rejects types it does not validate.

For orphan widgets, clone to a disposable PdfWriter and call reattach_fields only when each orphan has an unambiguous distinct field name. Reopen and verify that canonical fields reference the same objects as page widgets. Same-name detached objects must be reconciled deliberately: determine whether they are widgets of one field or separate fields, fix /Parent and /Kids in both directions, and remove duplicate roots. Never use a display-name match alone to merge objects.

XFA forms contain XML templates/datasets and may have no usable AcroForm representation. Detect /XFA before mutation. Use an XFA-capable native editor for dynamic layout and calculations; a local pypdf rewrite does not provide that engine. For a user-requested static result, print through such an editor, verify every value/page, and preserve the original. Signed PDFs require an explicit decision about invalidated signatures; no helper can preserve the original signature after arbitrary content changes.

For merge/split/rotate, clone or append selected pages with pypdf and preserve requested bookmarks/metadata. Verify page counts, order, rotation and internal link destinations. For OCR use an installed OCRmyPDF/Tesseract engine on a copy with the correct language pack. Check uncertain text against the scan; text extraction is not OCR.

For true redaction use PyMuPDF's redaction annotations followed by apply_redactions on a new output, with explicit handling of overlapping images/vector graphics. Reopen, search extracted text, inspect objects/attachments and render the affected pages. A drawn rectangle is not redaction. Do not deliver a redacted PDF until hidden text and attachments have been checked.

Encrypted inputs require the user's password; use a local protected input mechanism rather than putting secrets in command history. Password protection, permission flags, sanitization, redaction and digital signatures solve different problems and must be validated separately.

## Executable local operations

Use `scripts/edit-pdf.py source.pdf new-output.pdf <operation>`:

- `pages --select 3,1,2 --rotate 90`: select/reorder/rotate pages.
- `append second.pdf third.pdf`: append ordinary documents.
- `choice values.json`: fill single/multiple choice fields with validated export values.
- `repair-orphans`: attach uniquely named detached widgets; ambiguous names fail.
- `redact regions.json`: remove content in explicitly selected regions using PyMuPDF. Regions use one-based pages and points from top-left: `[{"page":1,"rect":[72,60,250,90]}]`. Check region coordinates against the source page first.

Run `pdf-forms.py inspect` after form repairs and render affected pages after every change. Signed/XFA documents are rejected by the helper; they require the native workflows above.
