#!/usr/bin/env bash

set -o pipefail

if [[ -z "${INJECTOR_ROOT:-}" ]]; then
  INJECTOR_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

readonly INJECTOR_ROOT
readonly PROJECT_ROOT="$(cd "$INJECTOR_ROOT/../.." && pwd)"
readonly DATASETS_DIR="$INJECTOR_ROOT/datasets"
readonly ASSETS_DIR="$INJECTOR_ROOT/assets"

COLOR_RESET='\033[0m'
COLOR_INFO='\033[1;34m'
COLOR_OK='\033[1;32m'
COLOR_WARN='\033[1;33m'
COLOR_ERR='\033[1;31m'

log_info() {
  printf "%b[%s] [INFO] %s%b\n" "$COLOR_INFO" "$(date +%H:%M:%S)" "$1" "$COLOR_RESET"
}

log_ok() {
  printf "%b[%s] [ OK ] %s%b\n" "$COLOR_OK" "$(date +%H:%M:%S)" "$1" "$COLOR_RESET"
}

log_warn() {
  printf "%b[%s] [WARN] %s%b\n" "$COLOR_WARN" "$(date +%H:%M:%S)" "$1" "$COLOR_RESET"
}

log_err() {
  printf "%b[%s] [ERR ] %s%b\n" "$COLOR_ERR" "$(date +%H:%M:%S)" "$1" "$COLOR_RESET" >&2
}

abort() {
  log_err "$1"
  exit 1
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    abort "Required command not found: $1"
  fi
}

safe_slug() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//'
}

load_env_file() {
  local env_input="${ENV_FILE:-${DOTENV_CONFIG_PATH:-}}"
  local env_file=""

  if [[ -z "$env_input" ]]; then
    env_file="$PROJECT_ROOT/.env.local"
  elif [[ "$env_input" = /* ]]; then
    env_file="$env_input"
  elif [[ -f "$env_input" ]]; then
    env_file="$(cd "$(dirname "$env_input")" && pwd)/$(basename "$env_input")"
  elif [[ -f "$PROJECT_ROOT/$env_input" ]]; then
    env_file="$PROJECT_ROOT/$env_input"
  else
    env_file="$env_input"
  fi

  if [[ ! -f "$env_file" ]]; then
    abort "Environment file not found: $env_file (default is $PROJECT_ROOT/.env.local)"
  fi

  set -a
  # shellcheck source=/dev/null
  . "$env_file"
  set +a

  export INJECTOR_ENV_FILE="$env_file"
  export SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
  export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
  export APP_BASE_URL="${INJECTOR_APP_BASE_URL:-${NEXT_PUBLIC_APP_URL:-http://localhost:4000}}"

  if [[ -z "$SUPABASE_URL" ]]; then
    abort "Missing NEXT_PUBLIC_SUPABASE_URL in $env_file"
  fi

  if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    abort "Missing SUPABASE_SERVICE_ROLE_KEY in $env_file"
  fi

  SUPABASE_URL="${SUPABASE_URL%/}"
  APP_BASE_URL="${APP_BASE_URL%/}"
  export SUPABASE_URL APP_BASE_URL
}

resolve_datasets_dir() {
  local configured="${INJECTOR_DATASETS_DIR:-$DATASETS_DIR}"
  local resolved="$configured"

  if [[ "$configured" != /* ]]; then
    if [[ -d "$PROJECT_ROOT/$configured" ]]; then
      resolved="$PROJECT_ROOT/$configured"
    elif [[ -d "$INJECTOR_ROOT/$configured" ]]; then
      resolved="$INJECTOR_ROOT/$configured"
    fi
  fi

  if [[ ! -d "$resolved" ]]; then
    abort "Datasets directory not found: $resolved"
  fi

  resolved="$(cd "$resolved" && pwd)"
  export INJECTOR_DATASETS_DIR="$resolved"
}

ensure_base_requirements() {
  require_cmd curl
  require_cmd jq
  require_cmd find
  require_cmd sed
}

json_escape() {
  jq -c . <<<"$1"
}

is_app_base_url_reachable() {
  local target="${APP_BASE_URL:-}"
  if [[ -z "$target" ]]; then
    return 1
  fi

  local status
  status="$(curl --silent --show-error --max-time 4 --connect-timeout 2 \
    --output /dev/null --write-out "%{http_code}" "$target" || true)"

  # Any HTTP status means the server answered (even 404/405 are acceptable for reachability).
  [[ "$status" =~ ^[0-9]{3}$ ]] && [[ "$status" != "000" ]]
}

require_reachable_app_base_url() {
  if is_app_base_url_reachable; then
    return 0
  fi

  log_err "Could not connect to APP_BASE_URL: $APP_BASE_URL"
  log_err "Start your app server (for example: npm run dev) or set INJECTOR_APP_BASE_URL."
  return 1
}
