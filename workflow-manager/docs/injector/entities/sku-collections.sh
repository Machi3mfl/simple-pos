#!/usr/bin/env bash

inject_sku_collections() {
  local records
  records="$(load_entity_records "sku-collections")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for sku-collections (scripts/injector/datasets/sku-collections/*.json)"
    return 0
  fi

  log_info "Injecting sku_collections ($total records)..."

  local ok_count=0
  local fail_count=0
  local attempted_tenants_bootstrap=0
  local row

  while IFS= read -r row; do
    local key collection_id tenant_id tenant_ref name description payload response_id
    local items_payload skus_count

    key="$(jq -r '.key // empty' <<<"$row")"
    collection_id="$(jq -r '.id // empty' <<<"$row")"
    tenant_id="$(jq -r '.tenantId // empty' <<<"$row")"
    tenant_ref="$(jq -r '.tenantRef // empty' <<<"$row")"
    name="$(jq -r '.name // empty' <<<"$row")"
    description="$(jq -r '.description // empty' <<<"$row")"

    if [[ -z "$collection_id" ]]; then
      if ! command -v uuidgen >/dev/null 2>&1; then
        log_err "sku-collections: uuidgen is required to generate IDs"
        fail_count=$((fail_count + 1))
        continue
      fi
      collection_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
    fi

    if [[ -z "$tenant_id" && -n "$tenant_ref" ]]; then
      tenant_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
    fi

    if [[ -z "$tenant_id" || -z "$name" ]]; then
      log_err "sku-collections: tenant/name required. key=${key:-<no-key>}"
      fail_count=$((fail_count + 1))
      continue
    fi

    if ! tenant_exists_in_db "$tenant_id"; then
      if [[ "$attempted_tenants_bootstrap" -eq 0 ]]; then
        attempted_tenants_bootstrap=1
        log_warn "sku-collections: referenced tenant is missing in DB. Running tenants dependency injection..."
        inject_tenants || log_warn "sku-collections: tenants dependency injection reported errors"
      fi

      if [[ -n "$tenant_ref" ]]; then
        tenant_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
      fi

      if [[ -z "$tenant_id" ]] || ! tenant_exists_in_db "$tenant_id"; then
        log_err "sku-collections: tenant not found in DB. key=${key:-<no-key>} tenantRef=${tenant_ref:-<none>} tenantId=${tenant_id:-<none>}"
        fail_count=$((fail_count + 1))
        continue
      fi
    fi

    payload="$(jq -cn \
      --arg id "$collection_id" \
      --arg tenant_id "$tenant_id" \
      --arg name "$name" \
      --arg description "$description" \
      '{
        id: $id,
        tenant_id: $tenant_id,
        name: $name,
        description: (if $description == "" then null else $description end)
      }'
    )"

    http_request "POST" "$(supabase_rest_url "sku_collections")?on_conflict=id" "$payload" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "Content-Type: application/json" \
      "Prefer: resolution=merge-duplicates,return=representation"

    if ! http_require_success "sku-collections: failed upsert for $name"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    response_id="$(jq -r '.[0].id // .id // empty' <<<"$HTTP_BODY")"
    if [[ -z "$response_id" ]]; then
      response_id="$collection_id"
    fi

    if [[ -n "$key" ]]; then
      refs_put "collections" "$key" "$response_id"
    fi

    http_request "DELETE" "$(supabase_rest_url "sku_collection_items")?collection_id=eq.$response_id" "" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

    if ! http_require_success "sku-collections: failed item cleanup for $name"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    items_payload="$(jq -c --arg collection_id "$response_id" '
      (.skus // [])
      | map({ collection_id: $collection_id, sku: . })
    ' <<<"$row")"

    skus_count="$(jq -r 'length' <<<"$items_payload")"
    if [[ "$skus_count" -gt 0 ]]; then
      http_request "POST" "$(supabase_rest_url "sku_collection_items")" "$items_payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json" \
        "Prefer: return=representation"

      if ! http_require_success "sku-collections: failed item insert for $name"; then
        fail_count=$((fail_count + 1))
        continue
      fi
    fi

    log_ok "Collection injected: $name ($response_id) with $skus_count SKU(s)"
    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "SKU Collections -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
