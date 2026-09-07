"""Compare rendered PNG pages. Differences are evidence for review, not a verdict."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    before = {p.name: p for p in args.before.glob('*.png')}
    after = {p.name: p for p in args.after.glob('*.png')}
    report = []
    for name in sorted(before.keys() | after.keys()):
        if name not in before or name not in after:
            report.append({'page': name, 'status': 'added' if name in after else 'removed'})
            continue
        with Image.open(before[name]) as a, Image.open(after[name]) as b:
            if a.size != b.size:
                report.append({'page': name, 'status': 'size-changed', 'before': a.size, 'after': b.size})
                continue
            delta = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
            delta.save(args.output / name)
            report.append({'page': name, 'status': 'changed' if delta.getbbox() else 'identical',
                           'meanChannelDifference': sum(ImageStat.Stat(delta).mean) / 3})
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
