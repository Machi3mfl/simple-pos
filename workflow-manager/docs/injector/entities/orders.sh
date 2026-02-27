#!/usr/bin/env bash

inject_orders() {
  if [[ "${INJECTOR_SKIP_API_STEPS:-0}" == "1" ]]; then
    log_warn "Skipping orders injection because INJECTOR_SKIP_API_STEPS=1"
    return 0
  fi

  if ! require_reachable_app_base_url; then
    return 1
  fi

  local records
  records="$(load_entity_records "orders")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for orders (scripts/injector/datasets/orders/*.json)"
    return 0
  fi

  log_info "Injecting orders via API ($total records)..."
  log_info "Endpoint: $APP_BASE_URL/api/orders"

  local ok_count=0
  local fail_count=0
  local row

  while IFS= read -r row; do
    local key tenant_id tenant_ref api_key api_client_ref payload response_order_id

    key="$(jq -r '.key // empty' <<<"$row")"
    tenant_id="$(jq -r '.tenantId // empty' <<<"$row")"
    tenant_ref="$(jq -r '.tenantRef // empty' <<<"$row")"
    api_key="$(jq -r '.apiKey // empty' <<<"$row")"
    api_client_ref="$(jq -r '.apiClientRef // empty' <<<"$row")"

    if [[ -z "$tenant_id" && -n "$tenant_ref" ]]; then
      tenant_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
    fi

    if [[ -z "$api_key" && -n "$api_client_ref" ]]; then
      api_key="$(resolve_api_key_from_ref "$api_client_ref" || true)"
    fi

    if [[ -z "$tenant_id" || -z "$api_key" ]]; then
      log_err "orders: could not resolve tenant/apiKey (key=${key:-<no-key>})"
      fail_count=$((fail_count + 1))
      continue
    fi

    payload="$(jq -cn \
      --arg tenantId "$tenant_id" \
      --arg externalReference "$(jq -r '.externalReference // empty' <<<"$row")" \
      --arg customerEmail "$(jq -r '.customerEmail // empty' <<<"$row")" \
      --argjson items "$(jq -c '.items // []' <<<"$row")" \
      '{
        tenantId: $tenantId,
        externalReference: (if $externalReference == "" then null else $externalReference end),
        customerEmail: (if $customerEmail == "" then null else $customerEmail end),
        items: $items
      } | with_entries(select(.value != null))'
    )"

    if [[ "$(jq -r '.items | length' <<<"$payload")" -eq 0 ]]; then
      log_err "orders: items is empty (key=${key:-<no-key>})"
      fail_count=$((fail_count + 1))
      continue
    fi

    http_request "POST" "$APP_BASE_URL/api/orders" "$payload" \
      "x-api-key: $api_key" \
      "Content-Type: application/json"

    if ! http_require_success "orders: failed create for key=${key:-<no-key>}"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    response_order_id="$(jq -r '.orderId // empty' <<<"$HTTP_BODY")"
    if [[ -n "$key" && -n "$response_order_id" ]]; then
      refs_put "orders" "$key" "$response_order_id"
    fi

    log_ok "Order created: ${response_order_id:-no-order-id}"
    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "Orders -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
