"""Render a DOCX through LibreOffice using an isolated profile and Poppler."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output_dir', type=Path, required=True)
    parser.add_argument('--emit_pdf', action='store_true')
    parser.add_argument('--dpi', type=int, default=120)
    args = parser.parse_args()
    if not args.source.is_file() or args.source.suffix.lower() != '.docx':
        parser.error('Source must be an existing DOCX')
    if not 36 <= args.dpi <= 300:
        parser.error('DPI must be between 36 and 300')
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if any(output.iterdir()):
        parser.error('Use an empty output directory to avoid stale pages')
    dependency_root = next((p for p in Path(sys.executable).resolve().parents if p.name == 'dependencies'), None)
    runtime = dependency_root / 'bin' / 'override' if dependency_root else None
    def executable(name):
        local = runtime / name if runtime else None
        found = str(local) if local and local.is_file() else shutil.which(name)
        if not found:
            raise RuntimeError(f'Missing {name}; install LibreOffice and Poppler')
        return found
    with tempfile.TemporaryDirectory() as scratch:
        scratch = Path(scratch)
        profile = scratch / 'profile'
        profile.mkdir()
        env = {**os.environ, 'XDG_CACHE_HOME': str(profile), 'XDG_CONFIG_HOME': str(profile)}
        subprocess.run([executable('soffice'), '-env:UserInstallation=' + profile.as_uri(),
                        '--headless', '--convert-to', 'pdf', '--outdir', str(scratch),
                        str(args.source.resolve())], check=True, capture_output=True, timeout=120, env=env)
        pdf = scratch / (args.source.stem + '.pdf')
        if not pdf.is_file():
            raise RuntimeError('LibreOffice did not produce a PDF')
        subprocess.run([executable('pdftoppm'), '-r', str(args.dpi), '-png', str(pdf),
                        str(output / 'page')], check=True, capture_output=True, timeout=120, env=env)
        pages = list(output.glob('page-*.png'))
        if not pages:
            raise RuntimeError('Poppler did not produce pages')
        if args.emit_pdf:
            shutil.copyfile(pdf, output / (args.source.stem + '.pdf'))
        print(f'Rendered {len(pages)} pages to {output}')


if __name__ == '__main__':
    main()
