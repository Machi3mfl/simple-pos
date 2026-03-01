#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Starting local Supabase stack"
npx -y supabase start

echo "[2/4] Resetting local database before release gate"
npx -y supabase db reset --local

echo "[3/4] Loading Supabase local environment"
supabase_env_output="$(npx -y supabase status -o env)"
supabase_env_exports="$(
  printf '%s\n' "$supabase_env_output" \
    | grep -E '^(API_URL|SERVICE_ROLE_KEY)=' \
    | sed 's/^/export /'
)"

if [[ -z "$supabase_env_exports" ]]; then
  echo "Could not parse API_URL/SERVICE_ROLE_KEY from 'supabase status -o env' output."
  exit 1
fi

eval "$supabase_env_exports"

: "${API_URL:?API_URL was not loaded from supabase status output.}"
: "${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY was not loaded from supabase status output.}"

export POS_BACKEND_MODE=supabase
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

echo "[4/4] Running real-backend release gate suite"
npx playwright test "$@" tests/e2e/release-gate-real-backend.spec.ts
