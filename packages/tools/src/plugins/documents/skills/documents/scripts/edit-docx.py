"""Apply explicit OOXML operations to a DOCX copy. See advanced-editing.md for JSON."""
import argparse
from datetime import datetime, timezone
import json
import re
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as E

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
NS = {'w': W}


def element(tag, text=None, **attrs):
    node = E.Element(f'{{{W}}}{tag}')
    for key, value in attrs.items():
        node.set(f'{{{W}}}{key}', str(value))
    if text is not None:
        node.text = text
        node.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    return node


def run(text, deleted=False):
    node = element('r')
    node.append(element('delText' if deleted else 't', text))
    return node


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('operations', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    operations = json.loads(args.operations.read_text())
    if not isinstance(operations, list) or not all(isinstance(op, dict) and isinstance(op.get('op'), str) for op in operations):
        raise ValueError('Operations must be an array of objects with an op string')
    with ZipFile(args.source) as package:
        parts = {name: package.read(name) for name in package.namelist()}
    xml_parser = E.XMLParser(resolve_entities=False, no_network=True)
    trees = {name: E.fromstring(data, xml_parser) for name, data in parts.items() if name.endswith(('.xml', '.rels'))}
    document = trees['word/document.xml']
    body = document.find('w:body', NS)
    paragraphs = document.xpath('//w:body/w:p', namespaces=NS)
    used = [int(v) for tree in trees.values() for v in tree.xpath('//@w:id', namespaces=NS) if v.isdigit()]
    next_id = max(used, default=0) + 1
    def fresh_id():
        nonlocal next_id
        result = next_id
        next_id += 1
        return result
    def paragraph(op):
        index = op.get('paragraph')
        if type(index) is not int or not 0 <= index < len(paragraphs):
            raise ValueError('paragraph must index a top-level body paragraph from audit-docx.py')
        return paragraphs[index]
    def part(name, root, content_type, relationship):
        if name not in trees:
            trees[name] = element(root)
            types = trees['[Content_Types].xml']
            E.SubElement(types, f'{{{CT}}}Override', PartName='/' + name, ContentType=content_type)
            rels = trees['word/_rels/document.xml.rels']
            ids = {r.get('Id') for r in rels}
            rid = 1
            while f'rId{rid}' in ids:
                rid += 1
            E.SubElement(rels, f'{{{R}}}Relationship', Id=f'rId{rid}', Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + relationship, Target=Path(name).name)
        return trees[name]
    for op in operations:
        kind = op['op']
        if kind in ('accept-revisions', 'reject-revisions'):
            accept = kind == 'accept-revisions'
            for tree in trees.values():
                # Property and table revisions require different restore semantics.
                if tree.xpath('//*[contains(local-name(), "PrChange") or starts-with(local-name(), "move")]', namespaces=NS):
                    raise ValueError('Property/move revisions need a native Word review workflow')
                for node in tree.xpath('//w:ins|//w:del', namespaces=NS):
                    parent = node.getparent()
                    if parent.tag != f'{{{W}}}p':
                        raise ValueError('Only ordinary paragraph run revisions are supported')
                    keep = (node.tag == f'{{{W}}}ins') == accept
                    if keep:
                        for child in list(node):
                            for text in child.iter(f'{{{W}}}delText'):
                                text.tag = f'{{{W}}}t'
                            parent.insert(parent.index(node), child)
                    parent.remove(node)
        elif kind == 'tracked-replace':
            p = paragraph(op)
            old, new = op['old'], op['new']
            if not isinstance(old, str) or not old or not isinstance(new, str):
                raise ValueError('old must be nonempty text; new must be text')
            matches = [t for t in p.xpath('./w:r/w:t', namespaces=NS) if old in (t.text or '')]
            if len(matches) != 1 or matches[0].text.count(old) != 1:
                raise ValueError('Replacement must uniquely match within one plain run; inspect split runs first')
            t = matches[0]
            source_run = t.getparent()
            if len(source_run.findall('w:t', NS)) != 1 or any(c.tag not in (f'{{{W}}}t', f'{{{W}}}rPr') for c in source_run):
                raise ValueError('Run contains fields or special content')
            before, after = t.text.split(old, 1)
            props = source_run.find('w:rPr', NS)
            def styled(text, deleted=False):
                result = run(text, deleted)
                if props is not None:
                    result.insert(0, E.fromstring(E.tostring(props)))
                return result
            nodes = [styled(before)] if before else []
            for tag, text in [('del', old), ('ins', new)]:
                node = element(tag, id=fresh_id(), author=op.get('author', 'Reviewer'), date=datetime.now(timezone.utc).isoformat())
                node.append(styled(text, tag == 'del'))
                nodes.append(node)
            if after:
                nodes.append(styled(after))
            index = p.index(source_run)
            p.remove(source_run)
            for node in nodes:
                p.insert(index, node)
                index += 1
        elif kind == 'comment':
            p = paragraph(op)
            if not p.findall('w:r', NS):
                raise ValueError('Comment requires a paragraph containing runs')
            comments = part('word/comments.xml', 'comments', 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml', 'comments')
            cid = fresh_id()
            comment = element('comment', id=cid, author=op.get('author', 'Reviewer'), date=datetime.now(timezone.utc).isoformat())
            cp = element('p'); cp.append(run(op['text'])); comment.append(cp); comments.append(comment)
            p.insert(1 if p.find('w:pPr', NS) is not None else 0, element('commentRangeStart', id=cid))
            p.append(element('commentRangeEnd', id=cid))
            ref = element('r'); ref.append(element('commentReference', id=cid)); p.append(ref)
        elif kind in ('footnote', 'endnote'):
            p = paragraph(op)
            plural = kind + 's'
            notes = part(f'word/{plural}.xml', plural, f'application/vnd.openxmlformats-officedocument.wordprocessingml.{plural}+xml', plural)
            nid = fresh_id()
            note = element(kind, id=nid); np = element('p'); np.append(run(op['text'])); note.append(np); notes.append(note)
            nr = element('r'); nr.append(element(kind + 'Reference', id=nid)); p.append(nr)
        elif kind == 'bookmark':
            p = paragraph(op); name = op['name']
            if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,39}', name) or document.xpath('//w:bookmarkStart[@w:name=$name]', namespaces=NS, name=name):
                raise ValueError('Bookmark name must be unique, start with a letter, and use up to 40 letters/digits/underscores')
            bid = fresh_id(); p.insert(1 if p.find('w:pPr', NS) is not None else 0, element('bookmarkStart', id=bid, name=name)); p.append(element('bookmarkEnd', id=bid))
        elif kind in ('toc', 'cross-reference', 'caption'):
            p = paragraph(op)
            instruction = {'toc': 'TOC \\o "1-3" \\h \\z \\u', 'cross-reference': 'REF ' + op.get('bookmark', '') + ' \\h', 'caption': 'SEQ ' + op.get('label', 'Figure') + ' \\* ARABIC'}[kind]
            if kind == 'cross-reference' and not document.xpath('//w:bookmarkStart[@w:name=$name]', namespaces=NS, name=op.get('bookmark', '')):
                raise ValueError('Cross-reference target does not exist')
            field = element('fldSimple', instr=instruction, dirty='true'); field.append(run(op.get('placeholder', 'Update field in Word'))); p.append(field)
        elif kind == 'content-control':
            p = paragraph(op); sdt = element('sdt'); props = element('sdtPr'); props.append(element('id', val=fresh_id())); props.append(element('tag', val=op['tag'])); content = element('sdtContent'); sdt.append(props); sdt.append(content); body.replace(p, sdt); content.append(p)
        elif kind == 'remove-comments':
            removed = {name for name in trees if name.startswith('word/comments') and name.endswith('.xml')}
            for name in removed:
                trees.pop(name)
                parts.pop(name, None)
            for tree in trees.values():
                for node in tree.xpath('//w:commentRangeStart|//w:commentRangeEnd|//w:commentReference', namespaces=NS):
                    node.getparent().remove(node)
            types = trees['[Content_Types].xml']
            for node in list(types):
                if node.get('PartName', '').lstrip('/') in removed:
                    types.remove(node)
            for name, tree in list(trees.items()):
                if name.endswith('.rels'):
                    for node in list(tree):
                        if node.get('Type', '').rsplit('/', 1)[-1].startswith('comments'):
                            tree.remove(node)
            for name in list(parts):
                if name.startswith('word/_rels/comments') and name.endswith('.rels'):
                    parts.pop(name)
                    trees.pop(name, None)
        elif kind == 'scrub-metadata':
            core = trees.get('docProps/core.xml')
            if core is not None:
                for child in list(core):
                    if E.QName(child).localname in ('creator', 'lastModifiedBy', 'description', 'keywords', 'lastPrinted'):
                        core.remove(child)
            for tree in trees.values():
                for node in tree.iter():
                    for key in list(node.attrib):
                        if E.QName(key).localname in ('author', 'initials'):
                            node.attrib[key] = 'Anonymous'
        else:
            raise ValueError(f'Unknown operation: {kind}')
    for name, tree in trees.items():
        parts[name] = E.tostring(tree, xml_declaration=True, encoding='UTF-8', standalone=True)
    with args.output.open('xb') as output:
        from zipfile import ZIP_DEFLATED
        with ZipFile(output, 'w', compression=ZIP_DEFLATED) as package:
            for name, data in parts.items():
                package.writestr(name, data)
    print(f'Wrote {args.output}; audit and render before delivery')


if __name__ == '__main__':
    main()
