#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

supabase_cli start
bash "$ROOT_DIR/scripts/supabase/write-local-env.sh"

printf "Local Supabase stack is ready for %s\n" "$SUPABASE_PROJECT_ID"
