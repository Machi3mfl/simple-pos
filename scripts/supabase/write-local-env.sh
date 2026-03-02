#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

supabase_env_output="$(supabase_cli status -o env)"
supabase_env_exports="$(
  printf "%s\n" "$supabase_env_output" \
    | grep -E "^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=" \
    | sed "s/^/export /"
)"

if [[ -z "$supabase_env_exports" ]]; then
  echo "Could not parse API_URL, ANON_KEY, or SERVICE_ROLE_KEY from 'supabase status -o env'."
  exit 1
fi

eval "$supabase_env_exports"

: "${API_URL:?API_URL was not loaded from supabase status output.}"
: "${ANON_KEY:?ANON_KEY was not loaded from supabase status output.}"
: "${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY was not loaded from supabase status output.}"

tmp_file="$(mktemp)"

if [[ -f "$LOCAL_ENV_FILE" ]]; then
  awk '
    BEGIN { skip = 0 }
    /^# BEGIN local-supabase$/ { skip = 1; next }
    /^# END local-supabase$/ { skip = 0; next }
    skip { next }
    /^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=/ { next }
    { print }
  ' "$LOCAL_ENV_FILE" > "$tmp_file"
else
  : > "$tmp_file"
fi

{
  if [[ -s "$tmp_file" ]]; then
    cat "$tmp_file"
    printf "\n"
  fi

  cat <<EOF
# BEGIN local-supabase
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
# END local-supabase
EOF
} > "$LOCAL_ENV_FILE"

rm -f "$tmp_file"

printf "Updated %s\n" "$LOCAL_ENV_FILE"
