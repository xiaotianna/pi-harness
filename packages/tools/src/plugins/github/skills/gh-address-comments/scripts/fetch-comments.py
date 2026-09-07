"""Read PR review threads through gh; report nested comment truncation explicitly."""
import argparse
import json
import re
import subprocess

QUERY = '''query($owner:String!,$repo:String!,$number:Int!,$cursor:String){
repository(owner:$owner,name:$repo){pullRequest(number:$number){number url title
reviewThreads(first:100,after:$cursor){pageInfo{hasNextPage endCursor} nodes{
id isResolved isOutdated path line diffSide originalLine
comments(first:100){pageInfo{hasNextPage endCursor} nodes{id body url author{login}}}
}}}}}'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--pr', required=True, type=int)
    parser.add_argument('--max-pages', type=int, default=10)
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo) or args.pr < 1 or not 1 <= args.max_pages <= 100:
        parser.error('Use owner/repo, a positive PR number and 1–100 pages')
    owner, repo = args.repo.split('/')
    cursor, threads, seen = None, [], set()
    for _ in range(args.max_pages):
        command = ['gh', 'api', 'graphql', '-f', 'query=' + QUERY, '-f', 'owner=' + owner,
                   '-f', 'repo=' + repo, '-F', 'number=' + str(args.pr)]
        if cursor:
            command += ['-f', 'cursor=' + cursor]
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=45)
        if len(result.stdout) > 4 * 1024 * 1024:
            raise ValueError('Review response too large; narrow the request')
        payload = json.loads(result.stdout)
        if payload.get('errors'):
            raise ValueError('GraphQL returned errors; check scope and authentication')
        pr = payload['data']['repository']['pullRequest']
        connection = pr['reviewThreads']
        threads.extend(connection['nodes'])
        if not connection['pageInfo']['hasNextPage']:
            cursor = None
            break
        cursor = connection['pageInfo']['endCursor']
        if not cursor or cursor in seen:
            raise ValueError('Invalid or repeated pagination cursor')
        seen.add(cursor)
    print(json.dumps({'pr': {'number': pr['number'], 'url': pr['url'], 'title': pr['title']},
        'threads': threads, 'hasMoreThreads': cursor is not None,
        'truncatedCommentThreads': [t['id'] for t in threads if t['comments']['pageInfo']['hasNextPage']]}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
