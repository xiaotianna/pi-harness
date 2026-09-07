"""Inspect PPTX package integrity, internal relationships and top-level shape bounds."""
import argparse
import json
import posixpath
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from pptx import Presentation


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('presentation', type=Path)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--expect-tables', type=Path)
    args = parser.parse_args()
    errors, warnings = [], []
    with ZipFile(args.presentation) as package:
        bad = package.testzip()
        if bad:
            errors.append(f'Corrupt ZIP member: {bad}')
        names = set(package.namelist())
        for name in names:
            if name.endswith(('.xml', '.rels')):
                tree = ET.fromstring(package.read(name))
                if name.endswith('.rels'):
                    owner_dir = posixpath.dirname(posixpath.dirname(name))
                    for rel in tree:
                        if rel.get('TargetMode') == 'External':
                            continue
                        target = unquote(rel.get('Target', '').split('#', 1)[0])
                        resolved = posixpath.normpath(posixpath.join(owner_dir, target)).lstrip('/')
                        if resolved not in names:
                            errors.append(f'{name}: missing {resolved}')
    prs = Presentation(args.presentation)
    if args.reference:
        reference = Presentation(args.reference)
        if (prs.slide_width, prs.slide_height) != (reference.slide_width, reference.slide_height):
            errors.append('Reference slide dimensions changed')
        with ZipFile(args.reference) as before, ZipFile(args.presentation) as after:
            parts = {n for n in before.namelist() + after.namelist() if n.startswith(('ppt/theme/', 'ppt/slideMasters/', 'ppt/slideLayouts/'))}
            for name in sorted(parts):
                if name not in before.namelist() or name not in after.namelist() or before.read(name) != after.read(name):
                    warnings.append('Template part changed: ' + name)
    if args.expect_tables:
        expected = json.loads(args.expect_tables.read_text())
        if not isinstance(expected, list):
            raise ValueError('Expected a JSON array of table-cell expectations')
        for item in expected:
            if not isinstance(item, dict) or type(item.get('slide')) is not int or not 1 <= item['slide'] <= len(prs.slides):
                raise ValueError('Invalid slide in table expectation')
            if type(item.get('row')) is not int or type(item.get('column')) is not int or item['row'] < 0 or item['column'] < 0:
                raise ValueError('Table coordinates must be nonnegative integers')
            candidates = [s for s in prs.slides[item['slide'] - 1].shapes if s.name == item.get('shape') and s.has_table]
            if len(candidates) != 1:
                raise ValueError('Expected a unique native table shape')
            actual = candidates[0].table.cell(item['row'], item['column']).text
            if actual != item.get('text'):
                errors.append(f"Table cell mismatch: {item}; got {actual!r}")
    slides = []
    for index, slide in enumerate(prs.slides, 1):
        for shape in slide.shapes:
            if shape.left < -12700 or shape.top < -12700 or shape.left + shape.width > prs.slide_width + 12700 or shape.top + shape.height > prs.slide_height + 12700:
                warnings.append(f'Slide {index}: out-of-bounds shape {shape.name}')
            if shape.has_chart:
                chart = shape.chart
                for series in chart.series:
                    if not series.values:
                        warnings.append(f'Slide {index}: empty chart series in {shape.name}')
                if not chart.has_title:
                    warnings.append(f'Slide {index}: verify chart title/nearby explanation for {shape.name}')
        slides.append({'slide': index, 'shapes': len(slide.shapes),
                       'charts': sum(s.has_chart for s in slide.shapes),
                       'tables': sum(s.has_table for s in slide.shapes)})
    print(json.dumps({'slides': slides, 'errors': errors, 'warnings': warnings}, ensure_ascii=False, indent=2))
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
