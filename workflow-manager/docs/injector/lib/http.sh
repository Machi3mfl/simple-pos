#!/usr/bin/env bash

HTTP_STATUS=''
HTTP_BODY=''

http_request() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  shift 3 || true

  local tmp_body
  tmp_body="$(mktemp "${TMPDIR:-/tmp}/injector.http.body.XXXXXX")"

  local curl_args
  curl_args=(
    -sS
    -o "$tmp_body"
    -w "%{http_code}"
    -X "$method"
    "$url"
  )

  while [[ $# -gt 0 ]]; do
    curl_args+=( -H "$1" )
    shift
  done

  if [[ -n "$body" ]]; then
    curl_args+=( -d "$body" )
  fi

  local curl_rc=0
  HTTP_STATUS="$(curl "${curl_args[@]}")" || curl_rc=$?

  HTTP_BODY="$(cat "$tmp_body")"
  rm -f "$tmp_body"

  if [[ "$curl_rc" -ne 0 ]]; then
    HTTP_STATUS='000'
    if [[ -z "$HTTP_BODY" ]]; then
      HTTP_BODY="curl error code: $curl_rc"
    fi
  fi
}

http_request_binary() {
  local method="$1"
  local url="$2"
  local file_path="$3"
  local content_type="$4"
  shift 4 || true

  local tmp_body
  tmp_body="$(mktemp "${TMPDIR:-/tmp}/injector.http.body.XXXXXX")"

  local curl_args
  curl_args=(
    -sS
    -o "$tmp_body"
    -w "%{http_code}"
    -X "$method"
    "$url"
    -H "Content-Type: $content_type"
    --data-binary "@$file_path"
  )

  while [[ $# -gt 0 ]]; do
    curl_args+=( -H "$1" )
    shift
  done

  local curl_rc=0
  HTTP_STATUS="$(curl "${curl_args[@]}")" || curl_rc=$?

  HTTP_BODY="$(cat "$tmp_body")"
  rm -f "$tmp_body"

  if [[ "$curl_rc" -ne 0 ]]; then
    HTTP_STATUS='000'
    if [[ -z "$HTTP_BODY" ]]; then
      HTTP_BODY="curl error code: $curl_rc"
    fi
  fi
}

http_is_success() {
  [[ "$HTTP_STATUS" =~ ^2[0-9]{2}$ ]]
}

http_require_success() {
  local context="$1"

  if http_is_success; then
    return 0
  fi

  log_err "$context (HTTP $HTTP_STATUS)"
  if [[ -n "$HTTP_BODY" ]]; then
    log_err "Details: $HTTP_BODY"
  fi
  return 1
}

supabase_rest_url() {
  local table="$1"
  printf '%s/rest/v1/%s' "$SUPABASE_URL" "$table"
}

supabase_storage_bucket_url() {
  printf '%s/storage/v1/bucket' "$SUPABASE_URL"
}

supabase_storage_object_url() {
  local bucket="$1"
  local object_path="$2"
  printf '%s/storage/v1/object/%s/%s' "$SUPABASE_URL" "$bucket" "$object_path"
}

supabase_auth_admin_users_url() {
  printf '%s/auth/v1/admin/users' "$SUPABASE_URL"
}

supabase_rest_headers() {
  printf '%s\n' "apikey: $SUPABASE_SERVICE_ROLE_KEY" "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "Content-Type: application/json"
}
