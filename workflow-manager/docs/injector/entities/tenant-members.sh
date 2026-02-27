#!/usr/bin/env bash

inject_tenant_members() {
  local records
  records="$(load_entity_records "tenant-members")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for tenant-members (scripts/injector/datasets/tenant-members/*.json)"
    return 0
  fi

  log_info "Injecting tenant-members ($total records)..."

  local ok_count=0
  local fail_count=0
  local row

  while IFS= read -r row; do
    local tenant_id tenant_ref user_id user_ref role payload

    tenant_id="$(jq -r '.tenantId // empty' <<<"$row")"
    tenant_ref="$(jq -r '.tenantRef // empty' <<<"$row")"
    user_id="$(jq -r '.userId // empty' <<<"$row")"
    user_ref="$(jq -r '.userRef // empty' <<<"$row")"
    role="$(jq -r '.role // "OWNER"' <<<"$row")"

    if [[ -z "$tenant_id" && -n "$tenant_ref" ]]; then
      tenant_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
    fi

    if [[ -z "$user_id" && -n "$user_ref" ]]; then
      user_id="$(resolve_user_id_from_ref "$user_ref" || true)"
    fi

    if [[ -z "$tenant_id" || -z "$user_id" ]]; then
      log_err "tenant-members: could not resolve tenant/user. tenantRef=$tenant_ref userRef=$user_ref"
      fail_count=$((fail_count + 1))
      continue
    fi

    payload="$(jq -cn \
      --arg tenant_id "$tenant_id" \
      --arg user_id "$user_id" \
      --arg role "$role" \
      '{tenant_id: $tenant_id, user_id: $user_id, role: $role}'
    )"

    http_request "POST" "$(supabase_rest_url "tenant_members")?on_conflict=tenant_id,user_id" "$payload" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "Content-Type: application/json" \
      "Prefer: resolution=merge-duplicates,return=representation"

    if ! http_require_success "tenant-members: failed upsert tenant=$tenant_id user=$user_id"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    log_ok "Tenant member injected: tenant=$tenant_id user=$user_id role=$role"
    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "Tenant Members -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
