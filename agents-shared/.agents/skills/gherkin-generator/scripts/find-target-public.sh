#!/usr/bin/env bash
# Locate TARGET_PUBLIC.md candidates from a repo root (default: cwd).
set -euo pipefail

ROOT="${1:-.}"
ROOT="$(cd "$ROOT" && pwd)"

echo "Searching under: $ROOT"

candidates=(
  "TARGET_PUBLIC.md"
  "docs/TARGET_PUBLIC.md"
  "docs/bdd/TARGET_PUBLIC.md"
  "docs/product/TARGET_PUBLIC.md"
  "marketing/reference/TARGET_PUBLIC.md"
  "marketing/TARGET_PUBLIC.md"
  ".agents/TARGET_PUBLIC.md"
)

found=0
for rel in "${candidates[@]}"; do
  path="$ROOT/$rel"
  if [[ -f "$path" ]]; then
    echo "FOUND  $path"
    found=1
  fi
done

# Recursive fallback (name match only)
while IFS= read -r path; do
  # skip if already printed as preferred candidate
  skip=0
  for rel in "${candidates[@]}"; do
    [[ "$path" == "$ROOT/$rel" ]] && skip=1 && break
  done
  [[ $skip -eq 1 ]] && continue
  echo "FOUND  $path"
  found=1
done < <(find "$ROOT" -name 'TARGET_PUBLIC.md' \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/.next/*' \
  2>/dev/null | sort)

related=0
for rel in \
  "marketing/reference/audiences.md" \
  "marketing/reference/competitors.md" \
  "docs/bdd/gherkin-conventions.md"
do
  path="$ROOT/$rel"
  if [[ -f "$path" ]]; then
    echo "RELATED $path"
    related=1
  fi
done

if [[ $found -eq 0 ]]; then
  echo "MISSING TARGET_PUBLIC.md"
  echo "Ask the user: provide target public, or authorize generate+web-research."
  exit 2
fi

exit 0
