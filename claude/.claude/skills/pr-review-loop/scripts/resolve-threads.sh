#!/usr/bin/env bash
# resolve-threads.sh — bulk-resolve PR review threads via the GraphQL mutation.
#
# Usage:
#   resolve-threads.sh <PRRT_id> [<PRRT_id> ...]
#   echo "id1\nid2" | resolve-threads.sh -
#
# IMPORTANT: only resolve a thread AFTER you've replied to it. A resolved
# thread without a reply looks like the feedback was dismissed silently.
#
# Output: one JSON line per thread with { id, isResolved }.

set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  echo "Usage: $0 <PRRT_id> [<PRRT_id> ...]   (or pipe IDs on stdin via '-')" >&2
  exit 64
fi

resolve_one() {
  local id="$1"
  gh api graphql \
    -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{id isResolved}}}' \
    -f id="$id" \
    --jq '.data.resolveReviewThread.thread'
}

if [[ "$1" == "-" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    resolve_one "$line"
  done
else
  for id in "$@"; do
    resolve_one "$id"
  done
fi
