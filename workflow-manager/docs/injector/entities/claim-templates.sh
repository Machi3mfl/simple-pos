#!/usr/bin/env bash

inject_claim_templates() {
  local records
  records="$(load_entity_records "claim-templates")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for claim-templates (scripts/injector/datasets/claim-templates/*.json)"
    return 0
  fi

  log_info "Injecting claim_templates ($total records)..."

  local ok_count=0
  local fail_count=0
  local attempted_tenants_bootstrap=0
  local attempted_collections_bootstrap=0
  local row

  while IFS= read -r row; do
    local key template_id scope_type scope_id tenant_id tenant_ref user_id user_ref
    local name layout_variant payload publish_now is_default status
    local response_id version_id skus_payload collections_payload

    key="$(jq -r '.key // empty' <<<"$row")"
    template_id="$(jq -r '.id // empty' <<<"$row")"
    scope_type="$(jq -r '.scopeType // "TENANT"' <<<"$row")"
    scope_id="$(jq -r '.scopeId // empty' <<<"$row")"
    tenant_id="$(jq -r '.tenantId // empty' <<<"$row")"
    tenant_ref="$(jq -r '.tenantRef // empty' <<<"$row")"
    user_id="$(jq -r '.userId // empty' <<<"$row")"
    user_ref="$(jq -r '.userRef // empty' <<<"$row")"
    name="$(jq -r '.name // empty' <<<"$row")"
    layout_variant="$(jq -r '.layoutVariant // "classic"' <<<"$row")"
    publish_now="$(jq -r '.publish // false' <<<"$row")"
    is_default="$(jq -r '.isDefault // true' <<<"$row")"
    status="$(jq -r '.status // "DRAFT"' <<<"$row")"

    if [[ -z "$template_id" ]]; then
      if ! command -v uuidgen >/dev/null 2>&1; then
        log_err "claim-templates: uuidgen is required to generate IDs"
        fail_count=$((fail_count + 1))
        continue
      fi
      template_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
    fi

    if [[ "$scope_type" == "TENANT" ]]; then
      if [[ -z "$scope_id" ]]; then
        if [[ -n "$tenant_id" ]]; then
          scope_id="$tenant_id"
        elif [[ -n "$tenant_ref" ]]; then
          scope_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
        fi
      fi
    elif [[ "$scope_type" == "USER" ]]; then
      if [[ -z "$scope_id" ]]; then
        if [[ -n "$user_id" ]]; then
          scope_id="$user_id"
        elif [[ -n "$user_ref" ]]; then
          scope_id="$(resolve_user_id_from_ref "$user_ref" || true)"
        fi
      fi
    else
      scope_id=""
    fi

    if [[ -z "$name" ]]; then
      log_err "claim-templates: name is required. key=${key:-<no-key>}"
      fail_count=$((fail_count + 1))
      continue
    fi

    if [[ "$scope_type" != "GLOBAL" && -z "$scope_id" ]]; then
      log_err "claim-templates: could not resolve scopeId. key=${key:-<no-key>} scopeType=$scope_type"
      fail_count=$((fail_count + 1))
      continue
    fi

    if [[ "$scope_type" == "TENANT" ]]; then
      if ! tenant_exists_in_db "$scope_id"; then
        if [[ "$attempted_tenants_bootstrap" -eq 0 ]]; then
          attempted_tenants_bootstrap=1
          log_warn "claim-templates: tenant scope missing in DB. Running tenants dependency injection..."
          inject_tenants || log_warn "claim-templates: tenants dependency injection reported errors"
        fi

        if [[ -n "$tenant_ref" ]]; then
          scope_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
        fi

        if [[ -z "$scope_id" ]] || ! tenant_exists_in_db "$scope_id"; then
          log_err "claim-templates: tenant scope not found in DB. key=${key:-<no-key>} tenantRef=${tenant_ref:-<none>} scopeId=${scope_id:-<none>}"
          fail_count=$((fail_count + 1))
          continue
        fi
      fi
    fi

    if [[ "$is_default" == "true" ]]; then
      local reset_payload reset_url
      reset_payload='{"is_default":false}'
      if [[ -n "$scope_id" ]]; then
        reset_url="$(supabase_rest_url "claim_templates")?scope_type=eq.$scope_type&scope_id=eq.$scope_id"
      else
        reset_url="$(supabase_rest_url "claim_templates")?scope_type=eq.$scope_type&scope_id=is.null"
      fi

      http_request "PATCH" "$reset_url" "$reset_payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json"

      if ! http_require_success "claim-templates: failed reset defaults ($scope_type/$scope_id)"; then
        fail_count=$((fail_count + 1))
        continue
      fi
    fi

    payload="$(jq -c \
      --arg id "$template_id" \
      --arg scope_type "$scope_type" \
      --arg scope_id "$scope_id" \
      --arg name "$name" \
      --arg status "$status" \
      --arg layout_variant "$layout_variant" \
      --argjson is_default "$is_default" \
      '{
        id: $id,
        scope_type: $scope_type,
        scope_id: (if $scope_id == "" then null else $scope_id end),
        name: $name,
        status: $status,
        is_default: $is_default,
        layout_variant: $layout_variant,
        layout_config: (.layoutConfig // {}),
        branding_config: (.brandingConfig // {})
      }' <<<"$row")"

    http_request "POST" "$(supabase_rest_url "claim_templates")?on_conflict=id" "$payload" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "Content-Type: application/json" \
      "Prefer: resolution=merge-duplicates,return=representation"

    if ! http_require_success "claim-templates: failed upsert for $name"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    response_id="$(jq -r '.[0].id // .id // empty' <<<"$HTTP_BODY")"
    if [[ -z "$response_id" ]]; then
      response_id="$template_id"
    fi

    http_request "DELETE" "$(supabase_rest_url "claim_template_skus")?template_id=eq.$response_id" "" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

    if ! http_require_success "claim-templates: failed SKU cleanup for $name"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    skus_payload="$(jq -c --arg template_id "$response_id" '
      (.skus // []) | map({template_id: $template_id, sku: .})
    ' <<<"$row")"

    if [[ "$(jq -r 'length' <<<"$skus_payload")" -gt 0 ]]; then
      http_request "POST" "$(supabase_rest_url "claim_template_skus")" "$skus_payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json"

      if ! http_require_success "claim-templates: failed SKU insert for $name"; then
        fail_count=$((fail_count + 1))
        continue
      fi
    fi

    http_request "DELETE" "$(supabase_rest_url "claim_template_collections")?template_id=eq.$response_id" "" \
      "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

    if ! http_require_success "claim-templates: failed collection cleanup for $name"; then
      fail_count=$((fail_count + 1))
      continue
    fi

    collections_payload="$(jq -cn --argjson row "$row" --arg template_id "$response_id" '
      (
        (($row.collectionIds // []) +
         (($row.collectionRefs // []) | map(.)))
      ) as $raw
      | $raw
    ')"

    local resolved_collections='[]'
    local collection_id
    while IFS= read -r collection_id; do
      if [[ -z "$collection_id" ]]; then
        continue
      fi

      if [[ "$collection_id" =~ ^[0-9a-fA-F-]{36}$ ]]; then
        if collection_exists_in_db "$collection_id"; then
          resolved_collections="$(jq -c --arg id "$collection_id" '. + [$id]' <<<"$resolved_collections")"
        else
          log_warn "claim-templates: collection id not found in DB ($collection_id) in template $name"
        fi
        continue
      fi

      local resolved
      resolved="$(resolve_collection_id_from_ref "$collection_id" || true)"
      if [[ -z "$resolved" ]] || ! collection_exists_in_db "$resolved"; then
        if [[ "$attempted_collections_bootstrap" -eq 0 ]]; then
          attempted_collections_bootstrap=1
          log_warn "claim-templates: collection reference missing in DB. Running sku-collections dependency injection..."
          inject_sku_collections || log_warn "claim-templates: sku-collections dependency injection reported errors"
          resolved="$(resolve_collection_id_from_ref "$collection_id" || true)"
        fi
      fi

      if [[ -n "$resolved" ]] && collection_exists_in_db "$resolved"; then
        resolved_collections="$(jq -c --arg id "$resolved" '. + [$id]' <<<"$resolved_collections")"
      else
        log_warn "claim-templates: unresolved collectionRef ($collection_id) in template $name"
      fi
    done < <(jq -r '.[]' <<<"$collections_payload")

    resolved_collections="$(jq -c 'unique' <<<"$resolved_collections")"
    if [[ "$(jq -r 'length' <<<"$resolved_collections")" -gt 0 ]]; then
      local template_collections_payload
      template_collections_payload="$(jq -c --arg template_id "$response_id" 'map({template_id: $template_id, collection_id: .})' <<<"$resolved_collections")"

      http_request "POST" "$(supabase_rest_url "claim_template_collections")" "$template_collections_payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json"

      if ! http_require_success "claim-templates: failed collection insert for $name"; then
        fail_count=$((fail_count + 1))
        continue
      fi
    fi

    version_id=""
    if [[ "$publish_now" == "true" || "$status" == "PUBLISHED" ]]; then
      http_request "PATCH" "$(supabase_rest_url "claim_template_versions")?template_id=eq.$response_id&status=eq.PUBLISHED" '{"status":"DRAFT"}' \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json"

      if ! http_require_success "claim-templates: failed reset published versions for $name"; then
        fail_count=$((fail_count + 1))
        continue
      fi

      local version_payload
      version_payload="$(jq -c \
        --arg template_id "$response_id" \
        --arg layout_variant "$layout_variant" \
        '{
          template_id: $template_id,
          status: "PUBLISHED",
          layout_variant: $layout_variant,
          layout_config: (.layoutConfig // {}),
          branding_config: (.brandingConfig // {})
        }' <<<"$row")"

      http_request "POST" "$(supabase_rest_url "claim_template_versions")" "$version_payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json" \
        "Prefer: return=representation"

      if ! http_require_success "claim-templates: failed version publish for $name"; then
        fail_count=$((fail_count + 1))
        continue
      fi

      version_id="$(jq -r '.[0].id // .id // empty' <<<"$HTTP_BODY")"

      http_request "PATCH" "$(supabase_rest_url "claim_templates")?id=eq.$response_id" '{"status":"PUBLISHED"}' \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json"

      if ! http_require_success "claim-templates: failed status update template $name"; then
        fail_count=$((fail_count + 1))
        continue
      fi
    fi

    if [[ -n "$key" ]]; then
      refs_put "templates" "$key" "$response_id"
      if [[ -n "$version_id" ]]; then
        refs_put "template_versions" "$key" "$version_id"
      fi
    fi

    log_ok "Template injected: $name ($response_id)"
    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "Claim Templates -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
