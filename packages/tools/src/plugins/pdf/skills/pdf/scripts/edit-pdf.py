"""Local PDF page operations, choice-field filling, orphan repair and redaction."""
import argparse
import json
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, NameObject, NumberObject, TextStringObject


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    sub = parser.add_subparsers(dest='operation', required=True)
    page = sub.add_parser('pages')
    page.add_argument('--select', required=True, help='One-based page numbers, comma-separated, in desired order')
    page.add_argument('--rotate', type=int, choices=[0, 90, 180, 270], default=0)
    merge = sub.add_parser('append'); merge.add_argument('files', nargs='+', type=Path)
    choice = sub.add_parser('choice'); choice.add_argument('values', type=Path)
    sub.add_parser('repair-orphans')
    redact = sub.add_parser('redact'); redact.add_argument('regions', type=Path, help='JSON [{page:1,rect:[x0,y0,x1,y1]}], PDF points from top-left')
    args = parser.parse_args()
    if args.output.exists() or args.output.resolve() == args.source.resolve():
        parser.error('Output must be a new file')
    reader = PdfReader(args.source)
    if reader.is_encrypted:
        raise ValueError('Decrypt an authorized copy before this operation')
    if any(f.get('/FT') == '/Sig' and f.get('/V') for f in (reader.get_fields() or {}).values()):
        raise ValueError('Signed document requires a dedicated signature handling workflow')
    form = reader.trailer['/Root'].get('/AcroForm')
    if form and '/XFA' in form.get_object():
        raise ValueError('XFA requires an XFA-capable native editor')
    if args.operation == 'redact':
        import pymupdf
        regions = json.loads(args.regions.read_text())
        if not isinstance(regions, list) or not regions:
            raise ValueError('Provide a nonempty list of redaction regions')
        doc = pymupdf.open(args.source)
        for region in regions:
            page = region['page']
            rect = region['rect']
            if type(page) is not int or not 1 <= page <= len(doc) or not isinstance(rect, list) or len(rect) != 4 or not all(type(v) in (int, float) for v in rect):
                raise ValueError('Invalid page/rectangle')
            target = pymupdf.Rect(rect)
            if target.is_empty or target.is_infinite or not doc[page - 1].rect.contains(target):
                raise ValueError('Rectangle must be within the page')
            doc[page - 1].add_redact_annot(target, fill=(0, 0, 0))
        for page in doc:
            page.apply_redactions(images=2, graphics=1, text=0)
        doc.save(args.output, garbage=4, deflate=True)
        doc.close()
        print('Redaction applied; verify hidden data/attachments and rendered pages before delivery')
        return
    writer = PdfWriter()
    if args.operation == 'pages':
        selected = [int(n) - 1 for n in args.select.split(',')]
        if not selected or any(n < 0 or n >= len(reader.pages) for n in selected):
            raise ValueError('Page index out of range')
        if reader.get_fields():
            raise ValueError('Page extraction with forms requires explicit field-name/relationship handling')
        writer.append(reader, pages=selected)
        for page in writer.pages:
            page.rotate(args.rotate)
    else:
        writer.clone_document_from_reader(reader)
        if args.operation == 'append':
            if reader.get_fields():
                raise ValueError('Merging interactive forms requires explicit field-name handling')
            for path in args.files:
                extra = PdfReader(path)
                if extra.get_fields() or extra.is_encrypted:
                    raise ValueError('Append only unencrypted non-form documents')
                writer.append(extra)
        elif args.operation == 'repair-orphans':
            fields = writer.get_fields() or {}
            names = set(fields)
            for page in writer.pages:
                for ref in page.get('/Annots', []):
                    widget = ref.get_object()
                    if widget.get('/Subtype') != '/Widget' or widget.get('/Parent'):
                        continue
                    name = str(widget.get('/T', ''))
                    if not name:
                        raise ValueError('Unnamed widget cannot be repaired automatically')
                    if name in fields and fields[name].indirect_reference == widget.indirect_reference:
                        continue
                    if name in names:
                        raise ValueError(f'Ambiguous detached field: {name}')
                    names.add(name)
            writer.reattach_fields()
            import runpy
            form_helpers = runpy.run_path(str(Path(__file__).with_name('pdf-forms.py')))
            form_helpers['fields_and_widgets'](writer)
        elif args.operation == 'choice':
            values = json.loads(args.values.read_text())
            fields = writer.get_fields() or {}
            if not isinstance(values, dict) or not values:
                raise ValueError('Provide a nonempty object mapping field names to values')
            for name, value in values.items():
                if name not in fields or fields[name].get('/FT') != '/Ch':
                    raise ValueError(f'Not a choice field: {name}')
                if not isinstance(value, str) and not (isinstance(value, list) and all(isinstance(v, str) for v in value)):
                    raise ValueError('Choice value must be a string or string array')
                selected = value if isinstance(value, list) else [value]
                options = fields[name].get('/Opt', [])
                exports = [str(o[0]) if isinstance(o, list) else str(o) for o in options]
                if any(v not in exports for v in selected):
                    raise ValueError(f'Unknown choice export: {name}')
                flags = int(fields[name].get('/Ff', 0))
                if isinstance(value, list) and flags & (1 << 17):
                    raise ValueError('Combo boxes require a single string value')
                if len(selected) > 1 and not flags & (1 << 21):
                    raise ValueError(f'Field does not permit multiple selections: {name}')
            for name, value in values.items():
                field = fields[name].indirect_reference.get_object()
                options = field['/Opt']
                exports = [str(o[0]) if isinstance(o, list) else str(o) for o in options]
                labels = [str(o[1]) if isinstance(o, list) else str(o) for o in options]
                if len(set(labels)) != len(labels):
                    raise ValueError('Duplicate display labels need explicit appearance handling')
                selected = value if isinstance(value, list) else [value]
                field[NameObject('/Opt')] = ArrayObject(TextStringObject(label) for label in labels)
                shown = [labels[exports.index(v)] for v in selected]
                writer.update_page_form_field_values(None, {name: shown if isinstance(value, list) else shown[0]}, auto_regenerate=False)
                field[NameObject('/Opt')] = options
                field[NameObject('/V')] = ArrayObject(TextStringObject(v) for v in value) if isinstance(value, list) else TextStringObject(value)
                field[NameObject('/I')] = ArrayObject(NumberObject(i) for i in sorted(exports.index(v) for v in selected))
    with args.output.open('xb') as output:
        writer.write(output)
    saved = PdfReader(args.output)
    if args.operation == 'choice':
        for name, expected in values.items():
            if saved.get_fields()[name].get('/V') != expected:
                raise ValueError(f'Saved choice value mismatch: {name}')
    print(f'Wrote {len(saved.pages)} pages; inspect structure and render affected pages')


if __name__ == '__main__':
    main()
