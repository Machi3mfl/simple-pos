#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

supabase_cli start
supabase_cli db reset --local
bash "$ROOT_DIR/scripts/supabase/write-local-env.sh"

printf "Local Supabase database was reset for %s\n" "$SUPABASE_PROJECT_ID"
