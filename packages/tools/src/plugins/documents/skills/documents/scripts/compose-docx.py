"""Merge DOCX copies with docxcompose's relationship/numbering handling."""
import argparse
from pathlib import Path
from docx import Document
from docxcompose.composer import Composer

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
parser.add_argument('sources', nargs='+', type=Path)
args = parser.parse_args()
if args.output.exists():
    parser.error('Output must be a new file')
composer = Composer(Document(args.sources[0]))
for source in args.sources[1:]:
    composer.append(Document(source))
with args.output.open('xb') as output:
    composer.save(output)
print(f'Merged {len(args.sources)} documents; verify section/header/footer semantics and render')
