"""Check saved formula caches and independently specified expected cell values."""
import argparse
import json
import math
from pathlib import Path

import openpyxl


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--require-cached', action='store_true')
    parser.add_argument('--expect', type=Path)
    parser.add_argument('--inventory', action='store_true')
    args = parser.parse_args()
    formulas = openpyxl.load_workbook(args.workbook, data_only=False)
    cached = openpyxl.load_workbook(args.workbook, data_only=True)
    errors, missing = [], []
    count = 0
    for sheet in formulas:
        for row in sheet:
            for cell in row:
                value = cached[sheet.title][cell.coordinate]
                key = f'{sheet.title}!{cell.coordinate}'
                if cell.data_type == 'f':
                    count += 1
                    if value.value is None:
                        missing.append(key)
                if cell.data_type == 'e' or value.data_type == 'e':
                    errors.append(f'{key}: {value.value or cell.value}')
    if args.expect:
        expected = json.loads(args.expect.read_text())
        if not isinstance(expected, dict):
            raise ValueError('Expected a JSON object mapping Sheet!Cell to values')
        for key, wanted in expected.items():
            sheet, address = key.rsplit('!', 1)
            actual = cached[sheet][address].value
            numeric = type(actual) in (int, float) and type(wanted) in (int, float)
            equal = math.isclose(actual, wanted, rel_tol=1e-9, abs_tol=1e-9) if numeric else type(actual) is type(wanted) and actual == wanted
            if not equal:
                errors.append(f'{key}: expected {wanted!r}, got {actual!r}')
    if args.inventory:
        print(json.dumps({'definedNames': {name: value.attr_text for name, value in formulas.defined_names.items()},
            'externalLinks': len(formulas._external_links),
            'worksheets': [{'name': sheet.title, 'state': sheet.sheet_state, 'dimensions': sheet.calculate_dimension(),
                'mergedRanges': [str(r) for r in sheet.merged_cells.ranges],
                'tables': list(sheet.tables), 'charts': len(sheet._charts),
                'validations': len(sheet.data_validations.dataValidation),
                'conditionalFormats': len(sheet.conditional_formatting),
                'protected': bool(sheet.protection.sheet), 'printArea': str(sheet.print_area)} for sheet in formulas]}, ensure_ascii=False, indent=2))
    print(json.dumps({'sheets': formulas.sheetnames, 'formulas': count,
                      'missingCacheCount': len(missing), 'missingCaches': missing[:100],
                      'errorCount': len(errors), 'errors': errors[:100]}, ensure_ascii=False, indent=2))
    formulas.close()
    cached.close()
    return int(bool(errors or (args.require_cached and missing)))


if __name__ == '__main__':
    raise SystemExit(main())
