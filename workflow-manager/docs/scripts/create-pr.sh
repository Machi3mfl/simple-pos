#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  workflow-manager/docs/scripts/create-pr.sh \
    --title "feat: claim templates branding" \
    [--body "Line 1\n- Bullet A\n- Bullet B"] \
    [--base main] \
    [--head <branch>]

Notes:
  - The script converts literal "\n" sequences into real newlines.
  - If --body is omitted, it uses .github/PULL_REQUEST_TEMPLATE.md.
  - It reads GITHUB_TOKEN (or GH_TOKEN) from .env.github when available.
EOF
}

TITLE=""
BODY=""
BASE="main"
HEAD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      TITLE="$2"
      shift 2
      ;;
    --body)
      BODY="$2"
      shift 2
      ;;
    --base)
      BASE="$2"
      shift 2
      ;;
    --head)
      HEAD="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TITLE" ]]; then
  echo "--title is required." >&2
  usage
  exit 1
fi

if [[ -z "$BODY" ]]; then
  if [[ -f ".github/PULL_REQUEST_TEMPLATE.md" ]]; then
    BODY="$(cat .github/PULL_REQUEST_TEMPLATE.md)"
    echo "ℹ️  Using .github/PULL_REQUEST_TEMPLATE.md as PR body."
  else
    echo "Missing --body and .github/PULL_REQUEST_TEMPLATE.md not found." >&2
    exit 1
  fi
fi

if [[ -z "$HEAD" ]]; then
  HEAD="$(git rev-parse --abbrev-ref HEAD)"
fi

# Load GitHub token without echoing secrets.
if [[ -f ".env.github" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.github"
  set +a
fi

TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "Missing GITHUB_TOKEN (or GH_TOKEN). Define it in .env.github." >&2
  exit 1
fi

REMOTE_URL="$(git remote get-url origin)"
export REMOTE_URL
OWNER_REPO="$(python3 - <<'PY'
import os
import re

url = os.environ["REMOTE_URL"]

# Supports:
# - https://token@github.com/owner/repo.git
# - https://github.com/owner/repo.git
# - git@github.com:owner/repo.git
m = re.search(r"github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/.]+)", url)
if not m:
    raise SystemExit("Could not parse owner/repo from origin remote.")
print(f"{m.group('owner')}/{m.group('repo')}")
PY
)"

# Convert literal "\n" sequences to real newlines, then send as JSON safely.
BODY_FIXED="$(printf '%b' "$BODY")"

PAYLOAD="$(jq -n \
  --arg title "$TITLE" \
  --arg head "$HEAD" \
  --arg base "$BASE" \
  --arg body "$BODY_FIXED" \
  '{title: $title, head: $head, base: $base, body: $body}'
)"

API_URL="https://api.github.com/repos/${OWNER_REPO}/pulls"

RESPONSE="$(curl -sS -X POST "$API_URL" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d "$PAYLOAD"
)"

PR_URL="$(printf '%s' "$RESPONSE" | jq -r '.html_url // empty')"
if [[ -z "$PR_URL" ]]; then
  echo "Failed to create PR. Response:" >&2
  printf '%s\n' "$RESPONSE" >&2
  exit 1
fi

echo "✅ PR created: $PR_URL"
