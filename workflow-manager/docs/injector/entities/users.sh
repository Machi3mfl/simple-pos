#!/usr/bin/env bash

inject_users() {
  local records
  records="$(load_entity_records "users")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for users (scripts/injector/datasets/users/*.json)"
    return 0
  fi

  log_info "Injecting users ($total records)..."

  local ok_count=0
  local fail_count=0
  local row

  while IFS= read -r row; do
    local key email password email_confirm user_metadata app_metadata user_id payload

    key="$(jq -r '.key // empty' <<<"$row")"
    email="$(jq -r '.email // empty' <<<"$row")"
    password="$(jq -r '.password // "password123"' <<<"$row")"
    email_confirm="$(jq -r '.emailConfirm // true' <<<"$row")"
    user_metadata="$(jq -c '.userMetadata // {}' <<<"$row")"
    app_metadata="$(jq -c '.appMetadata // {}' <<<"$row")"

    if [[ -z "$email" ]]; then
      log_err "users: record without email. key=${key:-<no-key>}"
      fail_count=$((fail_count + 1))
      continue
    fi

    user_id="$(find_user_id_by_email "$email" || true)"

    if [[ -n "$user_id" ]]; then
      payload="$(jq -cn \
        --arg email "$email" \
        --arg password "$password" \
        --argjson email_confirm "$email_confirm" \
        --argjson user_metadata "$user_metadata" \
        --argjson app_metadata "$app_metadata" \
        '{email: $email, password: $password, email_confirm: $email_confirm, user_metadata: $user_metadata, app_metadata: $app_metadata}'
      )"

      http_request "PUT" "$(supabase_auth_admin_users_url)/$user_id" "$payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json"

      if ! http_require_success "users: failed update for $email"; then
        fail_count=$((fail_count + 1))
        continue
      fi

      log_ok "User updated: $email"
    else
      payload="$(jq -cn \
        --arg email "$email" \
        --arg password "$password" \
        --argjson email_confirm "$email_confirm" \
        --argjson user_metadata "$user_metadata" \
        --argjson app_metadata "$app_metadata" \
        '{email: $email, password: $password, email_confirm: $email_confirm, user_metadata: $user_metadata, app_metadata: $app_metadata}'
      )"

      http_request "POST" "$(supabase_auth_admin_users_url)" "$payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json"

      if ! http_require_success "users: failed create for $email"; then
        fail_count=$((fail_count + 1))
        continue
      fi

      user_id="$(jq -r '.id // .user.id // empty' <<<"$HTTP_BODY")"
      log_ok "User created: $email"
    fi

    if [[ -z "$user_id" ]]; then
      user_id="$(find_user_id_by_email "$email" || true)"
    fi

    if [[ -n "$key" && -n "$user_id" ]]; then
      refs_put "users" "$key" "$user_id"
    fi

    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "Users -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
