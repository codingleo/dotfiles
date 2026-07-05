# gh + GraphQL Cheatsheet

Exact commands for every step of the PR review loop. These are battle-tested — copy them, don't paraphrase.

## Setup

The `gh` CLI must be authenticated (`gh auth status`). All `gh api graphql` calls use the same token.

`OWNER` and `REPO` below come from `gh repo view --json owner,name -q '.owner.login + "/" + .name'` or are visible in the PR URL.

## Phase 1: Fetch PR state

### PR metadata + body
```bash
gh pr view <PR> --json title,state,author,body,baseRefName,headRefName,url,mergeable,mergeStateStatus
```

### Inline review comments (the per-line ones)
```bash
gh api repos/<OWNER>/<REPO>/pulls/<PR>/comments --paginate
```
Each entry has `id` (numeric), `pull_request_review_id`, `user.login`, `body`, `path`, `line`, `in_reply_to_id` (only on replies).

### Issue-level comments (the conversation ones, not tied to lines)
```bash
gh api repos/<OWNER>/<REPO>/issues/<PR>/comments --paginate
```

### Reviews (approvals, change requests, top-level review bodies)
```bash
gh pr view <PR> --json reviews
```

### Review threads with thread IDs (REQUIRED for resolving)
The REST API doesn't expose `PRRT_*` thread IDs. Use GraphQL:

```bash
gh api graphql -f query='
  query($owner:String!,$name:String!,$pr:Int!){
    repository(owner:$owner, name:$name){
      pullRequest(number:$pr){
        reviewThreads(first:100){
          nodes{
            id
            isResolved
            isOutdated
            path
            comments(first:1){
              nodes{ databaseId author{login} body }
            }
          }
        }
      }
    }
  }
' -f owner=<OWNER> -f name=<REPO> -F pr=<PR>
```

Each `node.id` is the `PRRT_*` thread ID. The first comment's `databaseId` is the numeric ID you'll reply to.

### CI checks
```bash
gh pr checks <PR>                 # human-readable status
gh pr checks <PR> --watch         # blocks until all conclude
gh pr checks <PR> --json name,state,conclusion,detailsUrl,workflow
```

## Phase 6: Reply to a thread

The reply endpoint is per-comment, not per-thread. Reply to the **first comment** in the thread (the one whose `databaseId` you captured); GitHub nests it correctly.

```bash
gh api -X POST repos/<OWNER>/<REPO>/pulls/<PR>/comments/<COMMENT_ID>/replies \
  -f body='Fixed in <SHA>. <one-sentence what>. <optional why>.'
```

Replies are independent — run them in parallel:

```bash
gh api -X POST repos/<O>/<R>/pulls/<PR>/comments/123/replies -f body='...' &
gh api -X POST repos/<O>/<R>/pulls/<PR>/comments/456/replies -f body='...' &
gh api -X POST repos/<O>/<R>/pulls/<PR>/comments/789/replies -f body='...' &
wait
```

### Reply body conventions

- Lead with the commit SHA: `Fixed in 5b6d7253e.` or `Done in <SHA>.`
- One sentence on **what** changed.
- If you declined an alternative: a sentence on **why** (link a rule/incident/constraint).
- Avoid markdown headings; threads are narrow.

## Phase 6: Resolve a thread

```bash
gh api graphql \
  -f query='mutation($id:ID!){
    resolveReviewThread(input:{threadId:$id}){
      thread{ id isResolved }
    }
  }' \
  -f id="<PRRT_ID>"
```

Loop over your captured thread IDs. Confirm `isResolved: true` in each response.

To **unresolve** (rare):
```bash
gh api graphql -f query='mutation($id:ID!){unresolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id="<PRRT_ID>"
```

## Phase 7: Inspect a failing CI run

```bash
gh pr checks <PR> --json name,state,conclusion,detailsUrl
# pick the failing one; the detailsUrl ends in /runs/<RUN_ID>/job/<JOB_ID>

gh run view <RUN_ID>                       # summary of the failed run
gh run view <RUN_ID> --log-failed | tail -300   # only the failed-step logs
gh run view <RUN_ID> --log | grep -E "FAIL|Error" | head -50
```

For matrix builds, list the jobs first:
```bash
gh run view <RUN_ID> --json jobs -q '.jobs[] | {name, conclusion, databaseId}'
gh run view --job <JOB_DB_ID> --log-failed
```

To re-run a single failed job after pushing a fix:
```bash
gh run rerun <RUN_ID> --failed
```

## Quoting tips (heredoc bodies)

Long reply bodies with backticks/quotes are easiest via `--field` with a heredoc:

```bash
gh api -X POST repos/<O>/<R>/pulls/<PR>/comments/<ID>/replies --field body=@- <<'EOF'
Fixed in 5b6d7253e. Moved the URL-ownership check to pre-flight so a misconfigured
allowlist no longer burns an R2 upload. Skipped the constructor-throw alternative
because of the 6-day worker outage we tracked in oauth-provider-contract.
EOF
```

## Common pitfalls

- **Don't pass `--no-cache` flags to `gh`** — they don't exist; the API is uncached anyway.
- **`gh pr review` is for posting top-level reviews**, not for replying to threads. Use the `pulls/comments/{id}/replies` endpoint instead.
- **`gh pr comment` posts an issue-level comment**, not an inline reply. Different endpoint, different audience.
- **Pagination matters** — `--paginate` for `gh api` REST calls; GraphQL needs explicit `first: N` cursors.
- **A bot account can't be `@mentioned`** in replies; the reply notifies the bot's webhook anyway.
