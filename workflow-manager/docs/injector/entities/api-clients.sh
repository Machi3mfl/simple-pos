#!/usr/bin/env bash

inject_api_clients() {
  local records
  records="$(load_entity_records "api-clients")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for api-clients (scripts/injector/datasets/api-clients/*.json)"
    return 0
  fi

  log_info "Injecting tenant_api_clients ($total records)..."

  local ok_count=0
  local fail_count=0
  local row

  while IFS= read -r row; do
    local key tenant_id tenant_ref user_id user_ref template_id template_ref payload
    local api_key name response_id

    key="$(jq -r '.key // empty' <<<"$row")"
    tenant_id="$(jq -r '.tenantId // empty' <<<"$row")"
    tenant_ref="$(jq -r '.tenantRef // empty' <<<"$row")"
    user_id="$(jq -r '.createdByUserId // empty' <<<"$row")"
    user_ref="$(jq -r '.createdByUserRef // empty' <<<"$row")"
    template_id="$(jq -r '.defaultClaimTemplateId // empty' <<<"$row")"
    template_ref="$(jq -r '.defaultClaimTemplateRef // empty' <<<"$row")"
    api_key="$(jq -r '.apiKey // empty' <<<"$row")"
    name="$(jq -r '.name // empty' <<<"$row")"

    if [[ -z "$tenant_id" && -n "$tenant_ref" ]]; then
      tenant_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
    fi

    if [[ -z "$user_id" && -n "$user_ref" ]]; then
      user_id="$(resolve_user_id_from_ref "$user_ref" || true)"
    fi

    if [[ -z "$template_id" && -n "$template_ref" ]]; then
      template_id="$(resolve_template_id_from_ref "$template_ref" || true)"
    fi

    if [[ -z "$tenant_id" || -z "$api_key" || -z "$name" ]]; then
      log_err "api-clients: tenant/apiKey/name required. key=${key:-<no-key>}"
      fail_count=$((fail_count + 1))
      continue
    fi

    payload="$(jq -cn \
      --arg tenant_id "$tenant_id" \
      --arg name "$name" \
      --arg api_key "$api_key" \
      --arg user_id "$user_id" \
      --arg template_id "$template_id" \
      --arg version_id "$(jq -r '.defaultClaimTemplateVersionId // empty' <<<"$row")" \
      '{
        tenant_id: $tenant_id,
        name: $name,
        api_key: $api_key,
        created_by_user_id: (if $user_id == "" then null else $user_id end),
        default_claim_template_id: (if $template_id == "" then null else $template_id end),
        default_claim_template_version_id: (if $version_id == "" then null else $version_id end)
      }'
    )"

    http_request "POST" "$(supabase_rest_url "tenant_api_clients")?on_conflict=api_key" "$payload" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "Content-Type: application/json" \
      "Prefer: resolution=merge-duplicates,return=representation"

    if ! http_require_success "api-clients: failed upsert for apiKey=$api_key"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    response_id="$(jq -r '.[0].id // .id // empty' <<<"$HTTP_BODY")"
    if [[ -n "$key" && -n "$response_id" ]]; then
      refs_put "api_clients" "$key" "$response_id"
      refs_put "api_client_keys" "$key" "$api_key"
    fi

    log_ok "API client injected: $name ($api_key)"
    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "API Clients -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
