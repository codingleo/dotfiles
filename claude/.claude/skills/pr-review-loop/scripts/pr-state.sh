#!/usr/bin/env bash
# pr-state.sh — fetch everything you need to triage a PR in one shot.
#
# Usage:
#   pr-state.sh <pr-number>                 (uses current repo from gh)
#   pr-state.sh <pr-number> <owner> <repo>
#
# Output: a single JSON object with keys:
#   meta            : PR title, state, author, branches, mergeable, url
#   threads         : unresolved review threads (PRRT_* id, first comment databaseId, author, body, path, line)
#   issue_comments  : issue-level comments
#   reviews         : top-level reviews (approval / changes-requested / commented)
#   checks          : current CI status per check (name, state, conclusion, detailsUrl)
#
# Why this exists: the GraphQL `reviewThreads` query exposes the PRRT_* thread
# IDs that the REST API hides — without those IDs you can't resolve threads.
# Bundling all five queries into one call also keeps the agent's context lean.

set -euo pipefail

PR="${1:?Usage: pr-state.sh <pr-number> [owner] [repo]}"
OWNER="${2:-}"
REPO="${3:-}"

if [[ -z "$OWNER" || -z "$REPO" ]]; then
  read -r OWNER REPO < <(gh repo view --json owner,name -q '.owner.login + " " + .name')
fi

# 1. PR metadata
META=$(gh pr view "$PR" --repo "$OWNER/$REPO" \
  --json title,state,author,body,baseRefName,headRefName,url,mergeable,mergeStateStatus)

# 2. Unresolved review threads + first-comment databaseIds (for replies)
THREADS=$(gh api graphql -f query='
  query($owner:String!,$name:String!,$pr:Int!){
    repository(owner:$owner, name:$name){
      pullRequest(number:$pr){
        reviewThreads(first:100){
          nodes{
            id
            isResolved
            isOutdated
            path
            line
            comments(first:1){
              nodes{ databaseId author{login} body createdAt }
            }
          }
        }
      }
    }
  }
' -f owner="$OWNER" -f name="$REPO" -F pr="$PR" \
  --jq '[.data.repository.pullRequest.reviewThreads.nodes[]
         | select(.isResolved == false)
         | { id, path, line, isOutdated,
             firstComment: .comments.nodes[0] }]')

# 3. Issue-level comments
ISSUE_COMMENTS=$(gh api "repos/$OWNER/$REPO/issues/$PR/comments" --paginate \
  --jq '[.[] | { id, user: .user.login, body, created_at }]')

# 4. Reviews
REVIEWS=$(gh pr view "$PR" --repo "$OWNER/$REPO" --json reviews --jq '.reviews')

# 5. CI checks
CHECKS=$(gh pr checks "$PR" --repo "$OWNER/$REPO" --json name,state,conclusion,workflow,detailsUrl 2>/dev/null \
  || echo '[]')

jq -n \
  --argjson meta "$META" \
  --argjson threads "$THREADS" \
  --argjson issue_comments "$ISSUE_COMMENTS" \
  --argjson reviews "$REVIEWS" \
  --argjson checks "$CHECKS" \
  '{ meta: $meta, threads: $threads, issue_comments: $issue_comments, reviews: $reviews, checks: $checks }'
