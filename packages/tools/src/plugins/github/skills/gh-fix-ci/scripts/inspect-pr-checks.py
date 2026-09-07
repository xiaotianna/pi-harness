"""Read PR checks and bounded failed Actions log excerpts using gh."""
import argparse
import json
import re
import subprocess
from urllib.parse import urlparse


def gh(arguments):
    result = subprocess.run(['gh', *arguments], capture_output=True, text=True, timeout=45)
    if len(result.stdout) > 8 * 1024 * 1024:
        raise ValueError('CLI output too large; inspect a narrower job')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--pr', required=True, type=int)
    parser.add_argument('--max-runs', type=int, default=5)
    parser.add_argument('--max-lines', type=int, default=120)
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo) or args.pr < 1 or not 1 <= args.max_runs <= 20 or not 1 <= args.max_lines <= 500:
        parser.error('Invalid repository, PR or output limits')
    response = gh(['pr', 'checks', str(args.pr), '--repo', args.repo, '--json', 'name,state,bucket,link'])
    # gh returns 1 for failed checks and 8 for pending checks; both can contain valid JSON.
    if response.returncode not in (0, 1, 8):
        raise RuntimeError('Unable to read checks; verify gh authentication and repository scope')
    checks = json.loads(response.stdout)
    failures = [c for c in checks if c.get('bucket') == 'fail' or c.get('state', '').lower() in ('failure', 'error', 'timed_out', 'action_required')]
    logs, seen = [], set()
    for check in failures:
        path = urlparse(check.get('link', '')).path
        match = re.fullmatch('/' + re.escape(args.repo) + r'/actions/runs/(\d+)(?:/job/\d+)?/?', path)
        if not match:
            logs.append({'check': check['name'], 'externalUrl': check.get('link')})
            continue
        run_id = match[1]
        if run_id in seen or len(seen) >= args.max_runs:
            continue
        seen.add(run_id)
        result = gh(['run', 'view', run_id, '--repo', args.repo, '--log-failed'])
        lines = result.stdout.splitlines()
        logs.append({'runId': run_id, 'available': result.returncode == 0,
                     'excerpt': '\n'.join(lines[-args.max_lines:]), 'truncated': len(lines) > args.max_lines})
    run_ids = {re.search(r'/actions/runs/(\d+)', c.get('link', '')).group(1) for c in failures if re.search(r'/actions/runs/(\d+)', c.get('link', ''))}
    print(json.dumps({'checks': checks, 'logs': logs, 'uninspectedRunCount': len(run_ids - seen)}, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
