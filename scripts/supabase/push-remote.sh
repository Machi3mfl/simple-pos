#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

readonly DEFAULT_ENV_FILE="$ROOT_DIR/.env.local"
readonly ENV_FILE="${ENV_FILE:-${SUPABASE_ENV_FILE:-$DEFAULT_ENV_FILE}}"

load_env_file() {
  local target="$1"
  if [[ ! -f "$target" ]]; then
    return
  fi

  set -a
  # shellcheck source=/dev/null
  source "$target"
  set +a
}

apply_sslmode_if_configured() {
  local db_url="$1"
  local sslmode="${SUPABASE_DB_SSLMODE:-}"
  if [[ "$db_url" != postgresql://* && "$db_url" != postgres://* ]]; then
    printf "%s" "$db_url"
    return
  fi

  if [[ -z "$sslmode" ]]; then
    printf "%s" "$db_url"
    return
  fi

  local base_url="$db_url"
  local query=""
  if [[ "$db_url" == *"?"* ]]; then
    base_url="${db_url%%\?*}"
    query="${db_url#*\?}"
  fi

  local filtered_query=""
  if [[ -n "$query" ]]; then
    local old_ifs="$IFS"
    IFS='&'
    # shellcheck disable=SC2206
    local params=($query)
    IFS="$old_ifs"
    for param in "${params[@]}"; do
      if [[ -z "$param" || "$param" == sslmode=* ]]; then
        continue
      fi
      if [[ -z "$filtered_query" ]]; then
        filtered_query="$param"
      else
        filtered_query="${filtered_query}&${param}"
      fi
    done
  fi

  if [[ -z "$filtered_query" ]]; then
    printf "%s?sslmode=%s" "$base_url" "$sslmode"
    return
  fi

  printf "%s?%s&sslmode=%s" "$base_url" "$filtered_query" "$sslmode"
}

main() {
  load_env_file "$ENV_FILE"

  local db_url="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
  if [[ -z "$db_url" ]]; then
    cat <<'EOF'
Missing SUPABASE_DB_URL (or DATABASE_URL).

Usage:
  SUPABASE_DB_URL='postgresql://user:pass@host:5432/postgres?sslmode=require' \
    bash scripts/supabase/push-remote.sh

Or set it in an env file and run:
  ENV_FILE=.env.production.local bash scripts/supabase/push-remote.sh

Tip:
  Set SUPABASE_DB_SSLMODE=disable (or require) when your URL does not include sslmode.
EOF
    exit 1
  fi

  db_url="$(apply_sslmode_if_configured "$db_url")"

  local mode="apply"
  if [[ "${1:-}" == "--dry-run" ]]; then
    mode="dry-run"
  fi

  printf "Using env file: %s\n" "$ENV_FILE"
  printf "Applying migrations against remote database (%s)...\n" "$mode"

  if [[ "$mode" == "dry-run" ]]; then
    supabase_cli db push --db-url "$db_url" --dry-run
  else
    supabase_cli db push --db-url "$db_url"
  fi
}

main "$@"
