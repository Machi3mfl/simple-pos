#!/usr/bin/env bash

inject_tenants() {
  local records
  records="$(load_entity_records "tenants")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for tenants (scripts/injector/datasets/tenants/*.json)"
    return 0
  fi

  log_info "Injecting tenants ($total records)..."

  local ok_count=0
  local fail_count=0
  local row

  while IFS= read -r row; do
    local key tenant_id tenant_name claim_assets_bucket payload response_id

    key="$(jq -r '.key // empty' <<<"$row")"
    tenant_id="$(jq -r '.id // empty' <<<"$row")"
    tenant_name="$(jq -r '.name // empty' <<<"$row")"
    claim_assets_bucket="$(jq -r '.claimAssetsBucket // "claim-assets"' <<<"$row")"

    if [[ -z "$tenant_name" ]]; then
      log_err "tenants: record without name. key=${key:-<no-key>}"
      fail_count=$((fail_count + 1))
      continue
    fi

    if [[ -z "$tenant_id" ]]; then
      if ! command -v uuidgen >/dev/null 2>&1; then
        log_err "tenants: uuidgen is required to generate IDs"
        fail_count=$((fail_count + 1))
        continue
      fi
      tenant_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
    fi

    payload="$(jq -c \
      --arg id "$tenant_id" \
      --arg bucket "$claim_assets_bucket" \
      '{
        id: $id,
        name: .name,
        api_key: (.apiKey // null),
        claim_assets_bucket: $bucket,
        dek: (.dek // null),
        dek_encrypted: (.dekEncrypted // null),
        kek_id: (.kekId // null),
        dek_version: (.dekVersion // 1)
      }' <<<"$row")"

    http_request "POST" "$(supabase_rest_url "tenants")?on_conflict=id" "$payload" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "Content-Type: application/json" \
      "Prefer: resolution=merge-duplicates,return=representation"

    if ! http_require_success "tenants: failed upsert for $tenant_name"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    response_id="$(jq -r '.[0].id // .id // empty' <<<"$HTTP_BODY")"
    if [[ -z "$response_id" ]]; then
      response_id="$tenant_id"
    fi

    if [[ -n "$key" ]]; then
      refs_put "tenants" "$key" "$response_id"
    fi

    ensure_storage_bucket "$claim_assets_bucket" || {
      fail_count=$((fail_count + 1))
      continue
    }

    log_ok "Tenant injected: $tenant_name ($response_id)"
    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "Tenants -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
