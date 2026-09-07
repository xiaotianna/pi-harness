"""Report DOCX review objects, field instructions, layout and accessibility issues."""
import argparse
import json
from pathlib import Path
import posixpath
from urllib.parse import unquote
from zipfile import ZipFile
from lxml import etree as E

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    errors, warnings = [], []
    with ZipFile(args.source) as package:
        bad = package.testzip()
        if bad:
            errors.append('Corrupt ZIP member: ' + bad)
        names = set(package.namelist())
        trees = {n: E.fromstring(package.read(n), E.XMLParser(resolve_entities=False, no_network=True)) for n in names if n.endswith(('.xml', '.rels'))}
    for name, tree in trees.items():
        if name.endswith('.rels'):
            for rel in tree:
                if rel.get('TargetMode') == 'External':
                    continue
                target = unquote(rel.get('Target', '').split('#', 1)[0])
                resolved = posixpath.normpath(posixpath.join(posixpath.dirname(posixpath.dirname(name)), target)).lstrip('/')
                if resolved not in names:
                    errors.append(f'{name}: missing relationship target {resolved}')
    doc = trees['word/document.xml']
    def values(xpath):
        return doc.xpath(xpath, namespaces=NS)
    comments = trees.get('word/comments.xml')
    ids = comments.xpath('//w:comment/@w:id', namespaces=NS) if comments is not None else []
    for tag in ['commentRangeStart', 'commentRangeEnd', 'commentReference']:
        for cid in values(f'//w:{tag}/@w:id'):
            if cid not in ids:
                errors.append(f'{tag} refers to missing comment {cid}')
    for cid in ids:
        if not cid.isdigit():
            errors.append('Comment has a nonnumeric ID')
            continue
        for tag in ['commentRangeStart', 'commentRangeEnd', 'commentReference']:
            if values(f'count(//w:{tag}[@w:id="{cid}"])') != 1:
                warnings.append(f'Comment {cid}: inspect {tag} count')
    for image in values('//wp:docPr'):
        if not image.get('descr') and not image.get('title'):
            warnings.append(f'Image lacks alternative text: {image.get("name")}')
    if values('//w:fldSimple[@w:dirty="true"]|//w:r/w:fldChar[@w:dirty="true"]'):
        warnings.append('Fields are marked dirty: update in an office engine and verify cached results')
    for kind in ('footnote', 'endnote'):
        notes = trees.get(f'word/{kind}s.xml')
        defined = set(notes.xpath(f'//w:{kind}/@w:id', namespaces=NS)) if notes is not None else set()
        for nid in values(f'//w:{kind}Reference/@w:id'):
            if nid not in defined:
                errors.append(f'Missing {kind} {nid}')
    tables = []
    for index, table in enumerate(values('//w:tbl')):
        tables.append({'index': index, 'rows': len(table.findall('w:tr', NS)),
                       'gridWidths': table.xpath('./w:tblGrid/w:gridCol/@w:w', namespaces=NS)})
        if not table.xpath('./w:tr[1]/w:trPr/w:tblHeader', namespaces=NS):
            warnings.append(f'Table {index}: no repeating header row; check semantics')
    paragraphs = [{'index': i, 'text': ''.join(p.xpath('.//w:t/text()', namespaces=NS)),
                   'style': p.xpath('./w:pPr/w:pStyle/@w:val', namespaces=NS)}
                  for i, p in enumerate(values('//w:body/w:p'))]
    print(json.dumps({'paragraphs': paragraphs, 'tables': tables,
        'sections': len(values('//w:sectPr')), 'comments': ids,
        'insertions': len(values('//w:ins')), 'deletions': len(values('//w:del')),
        'fields': values('//w:instrText/text()|//w:fldSimple/@w:instr'),
        'bookmarks': values('//w:bookmarkStart/@w:name'),
        'contentControls': len(values('//w:sdt')), 'warnings': warnings, 'errors': errors}, ensure_ascii=False, indent=2))
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
