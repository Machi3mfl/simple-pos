#!/usr/bin/env bash

guess_content_type() {
  local file_path="$1"
  local extension
  extension="${file_path##*.}"
  extension="$(printf '%s' "$extension" | tr '[:upper:]' '[:lower:]')"

  case "$extension" in
    png) echo "image/png" ;;
    jpg|jpeg) echo "image/jpeg" ;;
    webp) echo "image/webp" ;;
    svg) echo "image/svg+xml" ;;
    gif) echo "image/gif" ;;
    *) echo "application/octet-stream" ;;
  esac
}

ensure_storage_bucket() {
  local bucket="$1"

  http_request "GET" "$SUPABASE_URL/storage/v1/bucket/$bucket" "" \
    "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

  if http_is_success; then
    return 0
  fi

  if [[ "$HTTP_STATUS" != "404" ]]; then
    log_warn "Could not verify bucket $bucket (HTTP $HTTP_STATUS). Attempting to create it."
  fi

  local payload
  payload="$(jq -cn --arg id "$bucket" '{id: $id, name: $id, public: true}')"

  http_request "POST" "$(supabase_storage_bucket_url)" "$payload" \
    "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "Content-Type: application/json"

  if http_is_success; then
    log_ok "Bucket ready: $bucket"
    return 0
  fi

  if grep -qi 'already exists' <<<"$HTTP_BODY"; then
    log_ok "Bucket already exists: $bucket"
    return 0
  fi

  log_err "Could not ensure bucket $bucket (HTTP $HTTP_STATUS)"
  log_err "$HTTP_BODY"
  return 1
}

upload_storage_file() {
  local bucket="$1"
  local object_path="$2"
  local file_path="$3"

  if [[ ! -f "$file_path" ]]; then
    log_err "File not found for upload: $file_path"
    return 1
  fi

  local content_type
  content_type="$(guess_content_type "$file_path")"

  http_request_binary "POST" "$(supabase_storage_object_url "$bucket" "$object_path")" "$file_path" "$content_type" \
    "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "x-upsert: true"

  if ! http_is_success; then
    log_err "Upload failed for $file_path (HTTP $HTTP_STATUS)"
    log_err "$HTTP_BODY"
    return 1
  fi

  printf '%s/%s\n' "$bucket" "$object_path"
}
