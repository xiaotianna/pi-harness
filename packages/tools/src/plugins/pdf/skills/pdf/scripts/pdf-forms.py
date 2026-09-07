"""Inspect, fill and verify ordinary AcroForms; preserve the source PDF."""
import argparse
import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter


def fields_and_widgets(reader):
    fields = reader.get_fields() or {}
    widgets = {}
    for page in reader.pages:
        for ref in page.get('/Annots', []):
            widget = ref.get_object()
            if widget.get('/Subtype') != '/Widget':
                continue
            parts, seen, node = [], set(), widget
            while node is not None:
                if id(node) in seen:
                    raise ValueError('Cyclic widget parent chain')
                seen.add(id(node))
                if '/T' in node:
                    parts.insert(0, str(node['/T']))
                parent = node.get('/Parent')
                node = parent.get_object() if parent else None
            name = '.'.join(parts)
            if not name or name not in fields:
                raise ValueError(f'Orphan or unnamed widget: {name!r}; repair a copy first')
            canonical = fields[name].indirect_reference
            node = widget
            while '/T' not in node and node.get('/Parent'):
                node = node['/Parent']
            if canonical and node.indirect_reference != canonical:
                raise ValueError(f'Ambiguous or detached field: {name}')
            widgets.setdefault(name, []).append(widget)
    return fields, widgets


def verify(reader, values):
    fields, widgets = fields_and_widgets(reader)
    for name, expected in values.items():
        if name not in fields or str(fields[name].get('/V', '')) != expected:
            raise ValueError(f'Field value mismatch: {name}')
        if name not in widgets:
            raise ValueError(f'Field has no page widget: {name}')
        if fields[name].get('/FT') == '/Btn' and expected != '/Off' and not any(w.get('/AS') == expected for w in widgets[name]):
            raise ValueError(f'No widget displays selected button state: {name}')
        for widget in widgets[name]:
            appearances = widget.get('/AP')
            appearance = appearances.get_object().get('/N') if appearances else None
            if appearance is None:
                raise ValueError(f'Missing appearance: {name}')
            appearance = appearance.get_object()
            if fields[name].get('/FT') == '/Btn':
                state = widget.get('/AS')
                if state not in appearance or state not in (expected, '/Off'):
                    raise ValueError(f'Invalid button appearance state: {name}')
            elif not hasattr(appearance, 'get_data') or not appearance.get_data():
                raise ValueError(f'Empty appearance stream: {name}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('inspect').add_argument('source', type=Path)
    for command in ('fill', 'verify'):
        p = sub.add_parser(command)
        p.add_argument('source', type=Path)
        p.add_argument('values', type=Path)
        if command == 'fill':
            p.add_argument('output', type=Path)
            p.add_argument('--flatten', action='store_true')
    args = parser.parse_args()
    reader = PdfReader(args.source)
    fields, widgets = fields_and_widgets(reader)
    if args.command == 'inspect':
        print(json.dumps({name: {'type': str(field.get('/FT', '')), 'value': str(field.get('/V', '')),
            'widgets': len(widgets.get(name, [])), 'states': field.get('/_States_', [])}
            for name, field in fields.items()}, ensure_ascii=False, indent=2))
        return
    values = json.loads(args.values.read_text())
    if not isinstance(values, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in values.items()):
        raise ValueError('Values must be a JSON object of field names to strings')
    if args.command == 'verify':
        verify(reader, values)
        print('Field values and appearance structure verified; visual review still required')
        return
    if any(field.get('/FT') == '/Sig' and field.get('/V') for field in fields.values()):
        raise ValueError('Signed PDF: editing requires an explicit signature handling workflow')
    acroform = reader.trailer['/Root'].get('/AcroForm')
    if acroform and '/XFA' in acroform.get_object():
        raise ValueError('XFA forms require a dedicated workflow')
    for name, value in values.items():
        if name not in fields or name not in widgets:
            raise ValueError(f'Unknown or invisible field: {name}')
        if fields[name].get('/FT') not in ('/Tx', '/Btn'):
            raise ValueError(f'Unsupported field type: {name}')
        if fields[name].get('/FT') == '/Btn' and value not in fields[name].get('/_States_', []):
            raise ValueError(f'Unknown button export state: {name}: {value}')
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    writer.update_page_form_field_values(None, values, auto_regenerate=False)
    verify(writer, values)
    if args.flatten:
        all_values = {name: str(field.get('/V', '')) for name, field in (writer.get_fields() or {}).items() if field.get('/FT') in ('/Tx', '/Btn')}
        if len(all_values) != len(fields):
            raise ValueError('Flattening unsupported field types requires a dedicated workflow')
        writer.update_page_form_field_values(None, all_values, auto_regenerate=False, flatten=True)
        writer.remove_annotations(subtypes='/Widget')
        writer._root_object.pop('/AcroForm', None)
    # Exclusive creation prevents accidental replacement of a source or prior output.
    with args.output.open('xb') as output:
        writer.write(output)
    result = PdfReader(args.output)
    if args.flatten:
        if result.get_fields() or any(a.get_object().get('/Subtype') == '/Widget' for p in result.pages for a in p.get('/Annots', [])):
            raise ValueError('Flattening left interactive fields')
    else:
        verify(result, values)
    print(f'Wrote {args.output}; render affected pages for visual verification')


if __name__ == '__main__':
    main()
