#!/usr/bin/env bash
set -Eeuo pipefail

INJECTOR_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=/dev/null
source "$INJECTOR_ROOT/lib/common.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/lib/http.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/lib/datasets.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/lib/refs.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/lib/relationships.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/lib/storage.sh"

# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/users.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/tenants.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/tenant-members.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/sku-collections.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/sku-metadata.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/claim-templates.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/api-clients.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/inventory.sh"
# shellcheck source=/dev/null
source "$INJECTOR_ROOT/entities/orders.sh"

SNAPSHOT_TABLES=(
  "tenants"
  "tenant_members"
  "tenant_api_clients"
  "tenant_dek_versions"
  "tenant_webhooks"
  "webhook_attempts"
  "sku_collections"
  "sku_collection_items"
  "claim_templates"
  "claim_template_versions"
  "claim_template_skus"
  "claim_template_collections"
  "claim_sku_metadata"
  "orders"
  "order_items"
  "claim_tokens"
  "product_keys"
  "audit_logs"
)

CLEAR_TABLES=(
  "webhook_attempts|id=not.is.null"
  "tenant_webhooks|id=not.is.null"
  "claim_template_skus|sku=neq.__never__"
  "claim_template_collections|collection_id=neq.00000000-0000-0000-0000-000000000000"
  "claim_template_versions|id=not.is.null"
  "claim_sku_metadata|id=not.is.null"
  "sku_collection_items|sku=neq.__never__"
  "sku_collections|id=not.is.null"
  "claim_templates|id=not.is.null"
  "claim_tokens|id=not.is.null"
  "order_items|id=not.is.null"
  "product_keys|id=not.is.null"
  "orders|id=not.is.null"
  "tenant_api_clients|id=not.is.null"
  "tenant_dek_versions|id=not.is.null"
  "audit_logs|id=not.is.null"
  "tenant_members|id=not.is.null"
  "tenants|id=not.is.null"
)

run_step() {
  local label="$1"
  shift
  local fn="$1"
  shift

  log_info "==== $label ===="
  if "$fn" "$@"; then
    log_ok "$label completed"
    return 0
  fi

  log_err "$label finished with errors"
  return 1
}

inject_all() {
  local failed=0

  run_step "Users" inject_users || failed=1
  run_step "Tenants" inject_tenants || failed=1
  run_step "Tenant Members" inject_tenant_members || failed=1
  run_step "SKU Collections" inject_sku_collections || failed=1
  run_step "SKU Metadata + Images" inject_sku_metadata || failed=1
  run_step "Claim Templates" inject_claim_templates || failed=1
  run_step "API Clients" inject_api_clients || failed=1
  run_step "Inventory" inject_inventory || failed=1
  run_step "Orders" inject_orders || failed=1

  return "$failed"
}

inject_customer_baseline() {
  local failed=0

  run_step "Users" inject_users || failed=1
  run_step "Tenants" inject_tenants || failed=1
  run_step "Tenant Members" inject_tenant_members || failed=1
  run_step "Claim Templates" inject_claim_templates || failed=1
  run_step "API Clients" inject_api_clients || failed=1

  return "$failed"
}

show_dataset_status() {
  log_info "Detected dataset status:"

  local entity records count
  for entity in users tenants tenant-members sku-collections sku-metadata claim-templates api-clients inventory orders; do
    records="$(load_entity_records "$entity")"
    count="$(records_count "$records")"
    printf '  - %-16s %s\n' "$entity" "$count"
  done
}

fetch_table_rows() {
  local table="$1"
  local page_size=500
  local offset=0
  local rows='[]'

  while true; do
    local range_end chunk chunk_count
    range_end=$((offset + page_size - 1))

    http_request "GET" "$(supabase_rest_url "$table")?select=*" "" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "Range-Unit: items" \
      "Range: $offset-$range_end"

    if ! http_is_success; then
      return 1
    fi

    chunk="$HTTP_BODY"
    if ! jq -e 'type == "array"' >/dev/null 2>&1 <<<"$chunk"; then
      return 1
    fi

    chunk_count="$(jq -r 'length' <<<"$chunk")"
    rows="$(jq -c --argjson chunk "$chunk" '. + $chunk' <<<"$rows")"

    if [[ "$chunk_count" -lt "$page_size" ]]; then
      break
    fi

    offset=$((offset + page_size))
  done

  printf '%s\n' "$rows"
}

fetch_auth_users() {
  local page=1
  local per_page=200
  local users='[]'

  while true; do
    local chunk chunk_count

    http_request "GET" "$(supabase_auth_admin_users_url)?page=$page&per_page=$per_page" "" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

    if ! http_is_success; then
      return 1
    fi

    chunk="$(jq -c '.users // []' <<<"$HTTP_BODY")"
    if ! jq -e 'type == "array"' >/dev/null 2>&1 <<<"$chunk"; then
      return 1
    fi

    chunk_count="$(jq -r 'length' <<<"$chunk")"
    users="$(jq -c --argjson chunk "$chunk" '. + $chunk' <<<"$users")"

    if [[ "$chunk_count" -lt "$per_page" ]]; then
      break
    fi
    page=$((page + 1))
  done

  printf '%s\n' "$users"
}

show_database_snapshot() {
  log_info "Database snapshot (before clear):"

  local table rows count
  local summary=()
  for table in "${SNAPSHOT_TABLES[@]}"; do
    echo
    log_info "Table: $table"

    if rows="$(fetch_table_rows "$table")"; then
      count="$(jq -r 'length' <<<"$rows")"
      log_info "Rows: $count"
      jq '.' <<<"$rows"
      summary+=("$table=$count")
    else
      log_warn "Could not read table $table (HTTP $HTTP_STATUS)"
      if [[ -n "$HTTP_BODY" ]]; then
        log_warn "$HTTP_BODY"
      fi
      summary+=("$table=ERROR")
    fi
  done

  echo
  log_info "Auth users snapshot:"
  local users
  if users="$(fetch_auth_users)"; then
    count="$(jq -r 'length' <<<"$users")"
    log_info "Rows: $count"
    jq '[.[] | {id, email, created_at, last_sign_in_at}]' <<<"$users"
    summary+=("auth_users=$count")
  else
    log_warn "Could not read auth users (HTTP $HTTP_STATUS)"
    if [[ -n "$HTTP_BODY" ]]; then
      log_warn "$HTTP_BODY"
    fi
    summary+=("auth_users=ERROR")
  fi

  echo
  log_info "Snapshot summary (rows per collection):"
  local item name value
  for item in "${summary[@]}"; do
    name="${item%%=*}"
    value="${item#*=}"
    printf '  - %-28s %s\n' "$name" "$value"
  done

  return 0
}

clear_all_tables() {
  local failed=0
  local entry table filter

  for entry in "${CLEAR_TABLES[@]}"; do
    IFS='|' read -r table filter <<<"$entry"

    http_request "DELETE" "$(supabase_rest_url "$table")?$filter" "" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

    if http_is_success; then
      log_ok "Cleared table: $table"
      continue
    fi

    if [[ "$HTTP_STATUS" == "404" ]]; then
      log_warn "Table not found (skipped): $table"
      continue
    fi

    log_err "Failed clearing table $table (HTTP $HTTP_STATUS)"
    if [[ -n "$HTTP_BODY" ]]; then
      log_err "$HTTP_BODY"
    fi
    failed=1
  done

  return "$failed"
}

clear_dataset_users() {
  local records
  records="$(load_entity_records "users")"

  if [[ "$(records_count "$records")" -eq 0 ]]; then
    log_info "No dataset users found to delete"
    return 0
  fi

  local failed=0
  local row email user_id

  while IFS= read -r row; do
    email="$(jq -r '.email // empty' <<<"$row")"
    if [[ -z "$email" ]]; then
      continue
    fi

    user_id="$(find_user_id_by_email "$email" || true)"
    if [[ -z "$user_id" ]]; then
      log_info "Auth user not found (skipped): $email"
      continue
    fi

    http_request "DELETE" "$(supabase_auth_admin_users_url)/$user_id" "" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

    if http_is_success; then
      log_ok "Deleted auth user: $email"
    else
      log_err "Failed deleting auth user $email (HTTP $HTTP_STATUS)"
      if [[ -n "$HTTP_BODY" ]]; then
        log_err "$HTTP_BODY"
      fi
      failed=1
    fi
  done < <(jq -c '.[]' <<<"$records")

  return "$failed"
}

clear_all_with_confirmation() {
  local force="${1:-0}"

  if [[ "$force" == "1" ]]; then
    log_warn "Force mode enabled: skipping full DB snapshot before clear-all."
  else
    show_database_snapshot
    echo
  fi

  local confirm
  local prompt="Do you want to delete ALL rows shown above? Type 'yes' to continue: "
  if [[ "$force" == "1" ]]; then
    prompt="Do you want to delete ALL injector-managed rows now (no snapshot shown)? Type 'yes' to continue: "
  fi
  if ! read -r -p "$prompt" confirm; then
    log_warn "No input received. Clear operation cancelled."
    return 0
  fi

  if [[ "$confirm" != "yes" ]]; then
    log_info "Clear operation cancelled. Nothing was deleted."
    return 0
  fi

  local failed=0
  run_step "Clear database tables" clear_all_tables || failed=1
  run_step "Delete dataset auth users" clear_dataset_users || failed=1

  if [[ "$failed" -eq 0 ]]; then
    log_ok "Clear all completed"
  fi

  return "$failed"
}

show_menu() {
  cat <<'MENU'

Data Injector (workflow-manager/docs/injector)
===================================
1) Inject users
2) Inject tenants
3) Inject tenant-members
4) Inject sku-collections
5) Inject sku-metadata + images
6) Inject claim-templates
7) Inject api-clients
8) Inject inventory (API)
9) Inject orders (API)
10) Inject TODO (full flow)
11) Show dataset status
12) Show resolved references (debug)
13) Show all (full DB snapshot)
14) Clear all (show DB data + confirm)
15) Inject customer baseline (onboarding)
0) Exit
MENU
}

print_usage() {
  cat <<'USAGE'
Usage:
  bash workflow-manager/docs/injector/injector.sh            # Interactive menu
  bash workflow-manager/docs/injector/injector.sh <option>   # Direct execution
  bash workflow-manager/docs/injector/injector.sh clear-all -f
  bash workflow-manager/docs/injector/injector.sh -f clear-all

Direct options:
  users | tenants | tenant-members | sku-collections | sku-metadata
  claim-templates | api-clients | inventory | orders | customer | all | status | refs | show-all | clear-all

Flags:
  -f, --force   only for clear-all; skips the full DB snapshot (show-all equivalent)
USAGE
}

execute_option() {
  local option="$1"
  local force_clear_all="${2:-0}"
  local rc=0

  case "$option" in
    1|users)
      run_step "Users" inject_users || rc=$?
      ;;
    2|tenants)
      run_step "Tenants" inject_tenants || rc=$?
      ;;
    3|tenant-members)
      run_step "Tenant Members" inject_tenant_members || rc=$?
      ;;
    4|sku-collections)
      run_step "SKU Collections" inject_sku_collections || rc=$?
      ;;
    5|sku-metadata)
      run_step "SKU Metadata + Images" inject_sku_metadata || rc=$?
      ;;
    6|claim-templates)
      run_step "Claim Templates" inject_claim_templates || rc=$?
      ;;
    7|api-clients)
      run_step "API Clients" inject_api_clients || rc=$?
      ;;
    8|inventory)
      run_step "Inventory" inject_inventory || rc=$?
      ;;
    9|orders)
      run_step "Orders" inject_orders || rc=$?
      ;;
    10|all)
      run_step "Full flow" inject_all || rc=$?
      ;;
    11|status)
      show_dataset_status
      ;;
    12|refs)
      refs_dump
      ;;
    13|show-all|snapshot)
      run_step "Show all database data" show_database_snapshot || rc=$?
      ;;
    14|clear-all|clear)
      run_step "Clear all data" clear_all_with_confirmation "$force_clear_all" || rc=$?
      ;;
    15|customer)
      run_step "Customer baseline" inject_customer_baseline || rc=$?
      ;;
    help|-h|--help)
      print_usage
      ;;
    0|exit|quit)
      return 2
      ;;
    *)
      log_warn "Invalid option: $option"
      rc=1
      ;;
  esac

  return "$rc"
}

main() {
  ensure_base_requirements
  load_env_file
  resolve_datasets_dir
  init_refs_store

  trap cleanup_refs_store EXIT

  log_info "ENV: $INJECTOR_ENV_FILE"
  log_info "Supabase URL: $SUPABASE_URL"
  log_info "App URL: $APP_BASE_URL"
  log_info "Datasets dir: $INJECTOR_DATASETS_DIR"
  log_info "Profile: ${INJECTOR_PROFILE:-all}"

  if [[ $# -gt 0 ]]; then
    local option=""
    local force_clear_all=0
    local arg

    for arg in "$@"; do
      case "$arg" in
        -f|--force)
          force_clear_all=1
          ;;
        *)
          if [[ -z "$option" ]]; then
            option="$arg"
          else
            log_warn "Ignoring extra argument: $arg"
          fi
          ;;
      esac
    done

    if [[ -z "$option" ]]; then
      print_usage
      return 1
    fi

    if [[ "$force_clear_all" -eq 1 ]] && [[ ! "$option" =~ ^(14|clear-all|clear)$ ]]; then
      log_warn "Flag -f/--force is only supported with clear-all. Ignoring flag for option: $option"
      force_clear_all=0
    fi

    execute_option "$option" "$force_clear_all"
    return $?
  fi

  while true; do
    show_menu
    read -r -p "Select an option: " choice

    local rc=0
    execute_option "$choice" || rc=$?
    if [[ "$rc" -eq 2 ]]; then
      log_info "Exiting injector"
      break
    fi
  done
}

main "$@"
