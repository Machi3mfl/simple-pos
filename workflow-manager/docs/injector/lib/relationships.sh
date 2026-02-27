#!/usr/bin/env bash

find_user_id_by_email() {
  local email="$1"

  http_request "GET" "$(supabase_auth_admin_users_url)?page=1&per_page=1000" "" \
    "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

  if ! http_is_success; then
    return 1
  fi

  jq -r --arg email "$email" '.users[] | select(.email == $email) | .id' <<<"$HTTP_BODY" | head -n 1
}

resolve_tenant_id_from_ref() {
  local ref="$1"

  if [[ -z "$ref" ]]; then
    return 0
  fi

  local value
  value="$(refs_get "tenants" "$ref")"
  if [[ -n "$value" ]]; then
    printf '%s\n' "$value"
    return 0
  fi

  local record
  record="$(get_record_by_key "tenants" "$ref")"
  if [[ -n "$record" ]]; then
    value="$(jq -r '.id // empty' <<<"$record")"
    if [[ -n "$value" ]]; then
      refs_put "tenants" "$ref" "$value"
      printf '%s\n' "$value"
      return 0
    fi
  fi

  return 1
}

tenant_exists_in_db() {
  local tenant_id="$1"

  if [[ -z "$tenant_id" ]]; then
    return 1
  fi

  local cached
  cached="$(refs_get "tenant_exists" "$tenant_id")"
  if [[ "$cached" == "1" ]]; then
    return 0
  fi

  http_request "GET" "$(supabase_rest_url "tenants")?id=eq.$tenant_id&select=id&limit=1" "" \
    "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

  if ! http_is_success; then
    return 1
  fi

  if [[ "$(jq -r 'length' <<<"$HTTP_BODY")" -gt 0 ]]; then
    refs_put "tenant_exists" "$tenant_id" "1"
    return 0
  fi

  return 1
}

resolve_collection_id_from_ref() {
  local ref="$1"

  if [[ -z "$ref" ]]; then
    return 0
  fi

  local value
  value="$(refs_get "collections" "$ref")"
  if [[ -n "$value" ]]; then
    printf '%s\n' "$value"
    return 0
  fi

  local record
  record="$(get_record_by_key "sku-collections" "$ref")"
  if [[ -n "$record" ]]; then
    value="$(jq -r '.id // empty' <<<"$record")"
    if [[ -n "$value" ]]; then
      refs_put "collections" "$ref" "$value"
      printf '%s\n' "$value"
      return 0
    fi
  fi

  return 1
}

collection_exists_in_db() {
  local collection_id="$1"

  if [[ -z "$collection_id" ]]; then
    return 1
  fi

  local cached
  cached="$(refs_get "collection_exists" "$collection_id")"
  if [[ "$cached" == "1" ]]; then
    return 0
  fi

  http_request "GET" "$(supabase_rest_url "sku_collections")?id=eq.$collection_id&select=id&limit=1" "" \
    "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

  if ! http_is_success; then
    return 1
  fi

  if [[ "$(jq -r 'length' <<<"$HTTP_BODY")" -gt 0 ]]; then
    refs_put "collection_exists" "$collection_id" "1"
    return 0
  fi

  return 1
}

resolve_template_id_from_ref() {
  local ref="$1"

  if [[ -z "$ref" ]]; then
    return 0
  fi

  local value
  value="$(refs_get "templates" "$ref")"
  if [[ -n "$value" ]]; then
    printf '%s\n' "$value"
    return 0
  fi

  local record
  record="$(get_record_by_key "claim-templates" "$ref")"
  if [[ -n "$record" ]]; then
    value="$(jq -r '.id // empty' <<<"$record")"
    if [[ -n "$value" ]]; then
      refs_put "templates" "$ref" "$value"
      printf '%s\n' "$value"
      return 0
    fi
  fi

  return 1
}

resolve_api_key_from_ref() {
  local ref="$1"

  if [[ -z "$ref" ]]; then
    return 0
  fi

  local value
  value="$(refs_get "api_client_keys" "$ref")"
  if [[ -n "$value" ]]; then
    printf '%s\n' "$value"
    return 0
  fi

  local record
  record="$(get_record_by_key "api-clients" "$ref")"
  if [[ -n "$record" ]]; then
    value="$(jq -r '.apiKey // empty' <<<"$record")"
    if [[ -n "$value" ]]; then
      refs_put "api_client_keys" "$ref" "$value"
      printf '%s\n' "$value"
      return 0
    fi
  fi

  return 1
}

resolve_user_id_from_ref() {
  local ref="$1"

  if [[ -z "$ref" ]]; then
    return 0
  fi

  local value
  value="$(refs_get "users" "$ref")"
  if [[ -n "$value" ]]; then
    printf '%s\n' "$value"
    return 0
  fi

  local record
  record="$(get_record_by_key "users" "$ref")"
  if [[ -n "$record" ]]; then
    local email
    email="$(jq -r '.email // empty' <<<"$record")"
    if [[ -n "$email" ]]; then
      value="$(find_user_id_by_email "$email")"
      if [[ -n "$value" ]]; then
        refs_put "users" "$ref" "$value"
        printf '%s\n' "$value"
        return 0
      fi
    fi
  fi

  return 1
}
