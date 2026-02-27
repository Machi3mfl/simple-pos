#!/usr/bin/env bash

build_inventory_keys_payload() {
  local row="$1"
  local sku="$2"

  jq -c --arg sku "$sku" '
    if (.keys | type) == "array" then
      .keys
    elif (.serials | type) == "array" and $sku != "" then
      (.serials | map({ sku: $sku, serial: . }))
    elif (.serial // "") != "" and $sku != "" then
      [{ sku: $sku, serial: .serial }]
    else
      []
    end
  ' <<<"$row"
}

inject_inventory() {
  if [[ "${INJECTOR_SKIP_API_STEPS:-0}" == "1" ]]; then
    log_warn "Skipping inventory injection because INJECTOR_SKIP_API_STEPS=1"
    return 0
  fi

  if ! require_reachable_app_base_url; then
    return 1
  fi

  local records
  records="$(load_entity_records "inventory")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for inventory (scripts/injector/datasets/inventory/*.json)"
    return 0
  fi

  log_info "Injecting inventory via API ($total batches)..."
  log_info "Endpoint: $APP_BASE_URL/api/inventory/upload"

  local ok_count=0
  local fail_count=0
  local row

  while IFS= read -r row; do
    local tenant_id tenant_ref api_key api_client_ref sku keys payload

    tenant_id="$(jq -r '.tenantId // empty' <<<"$row")"
    tenant_ref="$(jq -r '.tenantRef // empty' <<<"$row")"
    api_key="$(jq -r '.apiKey // empty' <<<"$row")"
    api_client_ref="$(jq -r '.apiClientRef // empty' <<<"$row")"
    sku="$(jq -r '.sku // empty' <<<"$row")"

    if [[ -z "$tenant_id" && -n "$tenant_ref" ]]; then
      tenant_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
    fi

    if [[ -z "$api_key" && -n "$api_client_ref" ]]; then
      api_key="$(resolve_api_key_from_ref "$api_client_ref" || true)"
    fi

    keys="$(build_inventory_keys_payload "$row" "$sku")"

    if [[ -z "$tenant_id" || -z "$api_key" || "$(jq -r 'length' <<<"$keys")" -eq 0 ]]; then
      log_err "inventory: tenant/apiKey/keys are required for each batch"
      fail_count=$((fail_count + 1))
      continue
    fi

    payload="$(jq -cn --arg tenantId "$tenant_id" --argjson keys "$keys" '{tenantId: $tenantId, keys: $keys}')"

    http_request "POST" "$APP_BASE_URL/api/inventory/upload" "$payload" \
      "x-api-key: $api_key" \
      "Content-Type: application/json"

    if ! http_require_success "inventory: failed upload for tenant=$tenant_id"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    log_ok "Inventory batch injected tenant=$tenant_id keys=$(jq -r 'length' <<<"$keys")"
    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "Inventory -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
