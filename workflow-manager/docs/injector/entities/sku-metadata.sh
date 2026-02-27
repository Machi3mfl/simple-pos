#!/usr/bin/env bash

get_brand_colors_config() {
  local datasets_root file
  datasets_root="$(get_datasets_root)"
  file="$datasets_root/shared/brand-colors.json"

  if [[ -f "$file" ]]; then
    jq -c '.' "$file"
  else
    printf '{}\n'
  fi
}

resolve_local_image_path() {
  local row="$1"
  local sku="$2"
  local type="$3"

  local explicit
  explicit="$(jq -r --arg type "$type" '.images[$type] // empty' <<<"$row")"

  if [[ -n "$explicit" ]]; then
    if [[ -f "$explicit" ]]; then
      printf '%s\n' "$explicit"
      return 0
    fi
    if [[ -f "$ASSETS_DIR/$explicit" ]]; then
      printf '%s\n' "$ASSETS_DIR/$explicit"
      return 0
    fi
  fi

  local brand
  brand="$(jq -r '.brand // empty' <<<"$row")"
  local brand_key
  brand_key="$(printf '%s' "$brand" | tr '[:upper:]' '[:lower:]')"

  # Apple SKUs should always use the shared white logo in claim previews,
  # even if a SKU-specific brand asset exists.
  if [[ "$type" == "brand" && "$brand_key" == "apple" ]]; then
    local apple_white_logo="$ASSETS_DIR/brands/apple-logo-white.png"
    if [[ -f "$apple_white_logo" ]]; then
      printf '%s\n' "$apple_white_logo"
      return 0
    fi
  fi

  local aliases=("$sku")
  if [[ "$sku" == *"-US-"* ]]; then
    aliases+=("${sku/-US-/-USA-}")
  elif [[ "$sku" == *"-USA-"* ]]; then
    aliases+=("${sku/-USA-/-US-}")
  fi

  local alias
  for alias in "${aliases[@]}"; do
    local sku_dir="$ASSETS_DIR/skus/$alias"
    local sku_slug_dir="$ASSETS_DIR/skus/$(safe_slug "$alias")"
    local candidate
    shopt -s nullglob
    for candidate in "$sku_dir/$type".* "$sku_slug_dir/$type".*; do
      if [[ -f "$candidate" ]]; then
        shopt -u nullglob
        printf '%s\n' "$candidate"
        return 0
      fi
    done
    shopt -u nullglob
  done

  if [[ -n "$brand" ]]; then
    local brands_dir="$ASSETS_DIR/brands"
    local candidate
    shopt -s nullglob
    for candidate in \
      "$brands_dir/$brand_key-logo-white".* \
      "$brands_dir/$brand_key-logo".* \
      "$brands_dir/$brand_key".*; do
      if [[ -f "$candidate" ]]; then
        shopt -u nullglob
        printf '%s\n' "$candidate"
        return 0
      fi
    done
    shopt -u nullglob
  fi

  return 1
}

get_tenant_bucket() {
  local tenant_id="$1"
  local cached

  cached="$(refs_get "tenant_buckets" "$tenant_id")"
  if [[ -n "$cached" ]]; then
    printf '%s\n' "$cached"
    return 0
  fi

  http_request "GET" "$(supabase_rest_url "tenants")?id=eq.$tenant_id&select=claim_assets_bucket" "" \
    "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

  if ! http_is_success; then
    return 1
  fi

  local bucket
  bucket="$(jq -r '.[0].claim_assets_bucket // "claim-assets"' <<<"$HTTP_BODY")"
  refs_put "tenant_buckets" "$tenant_id" "$bucket"
  printf '%s\n' "$bucket"
}

find_existing_sku_metadata_id() {
  local scope_type="$1"
  local scope_id="$2"
  local sku="$3"
  local collection_id="$4"

  local query
  query="$(supabase_rest_url "claim_sku_metadata")?select=id&scope_type=eq.$scope_type"

  if [[ -n "$scope_id" ]]; then
    query="$query&scope_id=eq.$scope_id"
  else
    query="$query&scope_id=is.null"
  fi

  query="$query&sku=eq.$sku"

  if [[ -n "$collection_id" ]]; then
    query="$query&collection_id=eq.$collection_id"
  else
    query="$query&collection_id=is.null"
  fi

  http_request "GET" "$query" "" \
    "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

  if ! http_is_success; then
    return 1
  fi

  jq -r '.[0].id // empty' <<<"$HTTP_BODY"
}

inject_sku_metadata() {
  local records
  records="$(load_entity_records "sku-metadata")"

  local total
  total="$(records_count "$records")"

  if [[ "$total" -eq 0 ]]; then
    log_warn "No datasets found for sku-metadata (scripts/injector/datasets/sku-metadata/*.json)"
    return 0
  fi

  local brand_colors
  brand_colors="$(get_brand_colors_config)"

  log_info "Injecting claim_sku_metadata ($total records)..."

  local ok_count=0
  local fail_count=0
  local attempted_tenants_bootstrap=0
  local attempted_collections_bootstrap=0
  local row

  while IFS= read -r row; do
    local scope_type scope_id tenant_id tenant_ref user_id user_ref sku
    local collection_id collection_ref brand brand_key brand_palette extra_json
    local bucket safe_sku brand_image_path product_image_path
    local brand_file product_file existing_id payload

    scope_type="$(jq -r '.scopeType // "TENANT"' <<<"$row")"
    scope_id="$(jq -r '.scopeId // empty' <<<"$row")"
    tenant_id="$(jq -r '.tenantId // empty' <<<"$row")"
    tenant_ref="$(jq -r '.tenantRef // empty' <<<"$row")"
    user_id="$(jq -r '.userId // empty' <<<"$row")"
    user_ref="$(jq -r '.userRef // empty' <<<"$row")"
    sku="$(jq -r '.sku // empty' <<<"$row")"
    collection_id="$(jq -r '.collectionId // empty' <<<"$row")"
    collection_ref="$(jq -r '.collectionRef // empty' <<<"$row")"
    brand="$(jq -r '.brand // empty' <<<"$row")"

    if [[ -z "$sku" ]]; then
      log_err "sku-metadata: sku is required"
      fail_count=$((fail_count + 1))
      continue
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

    if [[ "$scope_type" != "GLOBAL" && -z "$scope_id" ]]; then
      log_err "sku-metadata: could not resolve scopeId for sku=$sku"
      fail_count=$((fail_count + 1))
      continue
    fi

    if [[ "$scope_type" == "TENANT" ]]; then
      if ! tenant_exists_in_db "$scope_id"; then
        if [[ "$attempted_tenants_bootstrap" -eq 0 ]]; then
          attempted_tenants_bootstrap=1
          log_warn "sku-metadata: tenant scope is missing in DB. Running tenants dependency injection..."
          inject_tenants || log_warn "sku-metadata: tenants dependency injection reported errors"
        fi

        if [[ -n "$tenant_ref" ]]; then
          scope_id="$(resolve_tenant_id_from_ref "$tenant_ref" || true)"
        fi

        if [[ -z "$scope_id" ]] || ! tenant_exists_in_db "$scope_id"; then
          log_err "sku-metadata: tenant scope not found in DB for sku=$sku (tenantRef=${tenant_ref:-<none>} scopeId=${scope_id:-<none>})"
          fail_count=$((fail_count + 1))
          continue
        fi
      fi
    fi

    if [[ -z "$collection_id" && -n "$collection_ref" ]]; then
      collection_id="$(resolve_collection_id_from_ref "$collection_ref" || true)"
      if [[ -z "$collection_id" ]]; then
        log_warn "sku-metadata: unresolved collectionRef ($collection_ref) for sku=$sku"
      fi
    fi

    if [[ -n "$collection_id" ]] && ! collection_exists_in_db "$collection_id"; then
      if [[ "$attempted_collections_bootstrap" -eq 0 ]]; then
        attempted_collections_bootstrap=1
        log_warn "sku-metadata: referenced collection is missing in DB. Running sku-collections dependency injection..."
        inject_sku_collections || log_warn "sku-metadata: sku-collections dependency injection reported errors"
      fi

      if [[ -n "$collection_ref" ]]; then
        collection_id="$(resolve_collection_id_from_ref "$collection_ref" || true)"
      fi

      if [[ -z "$collection_id" ]] || ! collection_exists_in_db "$collection_id"; then
        log_err "sku-metadata: collection not found in DB for sku=$sku (collectionRef=${collection_ref:-<none>} collectionId=${collection_id:-<none>})"
        fail_count=$((fail_count + 1))
        continue
      fi
    fi

    extra_json="$(jq -c '.extra // {}' <<<"$row")"

    brand_key="$(printf '%s' "$brand" | tr '[:upper:]' '[:lower:]')"
    if [[ -n "$brand_key" ]]; then
      brand_palette="$(jq -c --arg brand "$brand_key" '.[$brand] // empty' <<<"$brand_colors")"
      if [[ -n "$brand_palette" ]]; then
        extra_json="$(jq -c --argjson palette "$brand_palette" '
          (if .brandColor == null and $palette.color != null then .brandColor = $palette.color else . end)
          | (if .brandTextColor == null and $palette.textColor != null then .brandTextColor = $palette.textColor else . end)
          | (if .brandInitials == null and $palette.initials != null then .brandInitials = $palette.initials else . end)
        ' <<<"$extra_json")"
      fi
    fi

    brand_image_path="$(jq -r '.brandImagePath // empty' <<<"$row")"
    product_image_path="$(jq -r '.productImagePath // empty' <<<"$row")"

    if [[ "$scope_type" == "TENANT" ]]; then
      tenant_id="$scope_id"
      bucket="$(get_tenant_bucket "$tenant_id" || echo "claim-assets")"
      ensure_storage_bucket "$bucket" || {
        fail_count=$((fail_count + 1))
        continue
      }

      safe_sku="$(safe_slug "$sku")"

      if [[ -z "$brand_image_path" ]]; then
        brand_file="$(resolve_local_image_path "$row" "$sku" "brand" || true)"
        if [[ -n "$brand_file" ]]; then
          local brand_ext
          brand_ext="${brand_file##*.}"
          brand_image_path="$(upload_storage_file "$bucket" "tenants/$tenant_id/skus/$safe_sku/brand.$brand_ext" "$brand_file" || true)"
          if [[ -z "$brand_image_path" ]]; then
            fail_count=$((fail_count + 1))
            continue
          fi
          log_ok "sku-metadata: uploaded brand image for $sku -> $brand_image_path"
        fi
      fi

      if [[ -z "$product_image_path" ]]; then
        product_file="$(resolve_local_image_path "$row" "$sku" "product" || true)"
        if [[ -n "$product_file" ]]; then
          local product_ext
          product_ext="${product_file##*.}"
          product_image_path="$(upload_storage_file "$bucket" "tenants/$tenant_id/skus/$safe_sku/product.$product_ext" "$product_file" || true)"
          if [[ -z "$product_image_path" ]]; then
            fail_count=$((fail_count + 1))
            continue
          fi
          log_ok "sku-metadata: uploaded product image for $sku -> $product_image_path"
        fi
      fi
    fi

    payload="$(jq -cn \
      --arg scope_type "$scope_type" \
      --arg scope_id "$scope_id" \
      --arg sku "$sku" \
      --arg collection_id "$collection_id" \
      --arg display_name "$(jq -r '.displayName // empty' <<<"$row")" \
      --argjson display_name_i18n "$(jq -c '.displayNameI18n // {}' <<<"$row")" \
      --arg brand "$brand" \
      --arg brand_image_path "$brand_image_path" \
      --arg product_image_path "$product_image_path" \
      --arg instructions_md "$(jq -r '.instructionsMd // empty' <<<"$row")" \
      --argjson instructions_md_i18n "$(jq -c '.instructionsMdI18n // {}' <<<"$row")" \
      --arg terms_md "$(jq -r '.termsMd // empty' <<<"$row")" \
      --argjson terms_md_i18n "$(jq -c '.termsMdI18n // {}' <<<"$row")" \
      --arg support_url "$(jq -r '.supportUrl // empty' <<<"$row")" \
      --argjson extra_json "$extra_json" \
      '{
        scope_type: $scope_type,
        scope_id: (if $scope_id == "" then null else $scope_id end),
        sku: $sku,
        collection_id: (if $collection_id == "" then null else $collection_id end),
        display_name: (if $display_name == "" then null else $display_name end),
        display_name_i18n: $display_name_i18n,
        brand: (if $brand == "" then null else $brand end),
        brand_image_path: (if $brand_image_path == "" then null else $brand_image_path end),
        product_image_path: (if $product_image_path == "" then null else $product_image_path end),
        instructions_md: (if $instructions_md == "" then null else $instructions_md end),
        instructions_md_i18n: $instructions_md_i18n,
        terms_md: (if $terms_md == "" then null else $terms_md end),
        terms_md_i18n: $terms_md_i18n,
        support_url: (if $support_url == "" then null else $support_url end),
        extra_json: $extra_json,
        updated_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
      }'
    )"

    existing_id="$(find_existing_sku_metadata_id "$scope_type" "$scope_id" "$sku" "$collection_id" || true)"

    if [[ -n "$existing_id" ]]; then
      http_request "PATCH" "$(supabase_rest_url "claim_sku_metadata")?id=eq.$existing_id" "$payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json" \
        "Prefer: return=representation"

      if ! http_require_success "sku-metadata: failed update sku=$sku"; then
        fail_count=$((fail_count + 1))
        continue
      fi
    else
      http_request "POST" "$(supabase_rest_url "claim_sku_metadata")" "$payload" \
        "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "Content-Type: application/json" \
        "Prefer: return=representation"

      if ! http_require_success "sku-metadata: failed insert sku=$sku"; then
        fail_count=$((fail_count + 1))
        continue
      fi
    fi

    log_ok "SKU metadata injected: $sku (scope=$scope_type)"
    ok_count=$((ok_count + 1))
  done < <(jq -c '.[]' <<<"$records")

  log_info "SKU Metadata -> OK: $ok_count | Errors: $fail_count"
  [[ "$fail_count" -eq 0 ]]
}
