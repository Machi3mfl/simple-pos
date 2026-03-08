#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../scripts/supabase" && pwd)/common.sh"

cd "$ROOT_DIR"

echo "[1/4] Starting local Supabase stack"
supabase_cli start

echo "[2/4] Resetting local database before tutorial recording"
supabase_cli db reset --local

echo "[3/4] Loading Supabase local environment"
supabase_env_output="$(supabase_cli status -o env)"
supabase_env_exports="$(
  printf '%s\n' "$supabase_env_output" \
    | grep -E '^(ANON_KEY|API_URL|SERVICE_ROLE_KEY)=' \
    | sed 's/^/export /'
)"

if [[ -z "$supabase_env_exports" ]]; then
  echo "Could not parse ANON_KEY/API_URL/SERVICE_ROLE_KEY from 'supabase status -o env' output."
  exit 1
fi

eval "$supabase_env_exports"

: "${ANON_KEY:?ANON_KEY was not loaded from supabase status output.}"
: "${API_URL:?API_URL was not loaded from supabase status output.}"
: "${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY was not loaded from supabase status output.}"

export POS_BACKEND_MODE=supabase
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export POS_ALLOW_GUEST_WORKSPACES=1

echo "[4/4] Recording tutorial suite"
npx playwright test -c playwright.tutorials.config.ts "$@"
