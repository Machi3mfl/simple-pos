#!/usr/bin/env bash
set -Eeuo pipefail

INJECTOR_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$INJECTOR_ROOT/../.." && pwd)"

DEFAULT_ENV_FILE="$PROJECT_ROOT/.env.onboarding"
ENV_FILE_INPUT="$DEFAULT_ENV_FILE"
OUTPUT_DIR=""
DRY_RUN=0

print_usage() {
  cat <<'USAGE'
Usage:
  bash workflow-manager/docs/injector/onboard-customer.sh [--env-file .env.onboarding] [--output-dir path] [--dry-run]

Options:
  --env-file <path>   Environment file with Supabase credentials + ONBOARD_* values.
                      Default: <project-root>/.env.onboarding
  --output-dir <dir>  Persist generated datasets in this directory.
                      Default: temporary directory in /tmp
  --dry-run           Generate datasets and print summary without running injector.
  -h, --help          Show help.
USAGE
}

log() {
  printf '[onboard-customer] %s\n' "$1"
}

abort() {
  printf '[onboard-customer] ERROR: %s\n' "$1" >&2
  exit 1
}

safe_slug() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//'
}

normalize_bool() {
  local value
  value="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  case "$value" in
    1|true|yes|y) printf 'true\n' ;;
    *) printf 'false\n' ;;
  esac
}

random_hex_64() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return 0
  fi

  if command -v uuidgen >/dev/null 2>&1; then
    local base
    base="$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]')"
    printf '%s%s\n' "$base" "$base"
    return 0
  fi

  printf '%064x\n' "$RANDOM$RANDOM$RANDOM$RANDOM"
}

random_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 8
    return 0
  fi

  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-16
    return 0
  fi

  printf '%08x%08x\n' "$RANDOM" "$RANDOM"
}

csv_to_json_array() {
  local csv="${1:-}"
  jq -cn --arg csv "$csv" '
    ($csv | split(",")) as $items
    | [
        $items[]
        | gsub("^[[:space:]]+|[[:space:]]+$"; "")
        | select(length > 0)
      ]
  '
}

resolve_path() {
  local input="$1"
  if [[ "$input" = /* ]]; then
    printf '%s\n' "$input"
    return 0
  fi
  if [[ -f "$input" || -d "$input" ]]; then
    printf '%s/%s\n' "$(cd "$(dirname "$input")" && pwd)" "$(basename "$input")"
    return 0
  fi
  printf '%s/%s\n' "$PROJECT_ROOT" "$input"
}

require_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    abort "Missing required variable: $name"
  fi
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env-file)
        [[ $# -lt 2 ]] && abort "Missing value for --env-file"
        ENV_FILE_INPUT="$2"
        shift 2
        ;;
      --output-dir)
        [[ $# -lt 2 ]] && abort "Missing value for --output-dir"
        OUTPUT_DIR="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      -h|--help)
        print_usage
        exit 0
        ;;
      *)
        abort "Unknown option: $1"
        ;;
    esac
  done
}

main() {
  command -v jq >/dev/null 2>&1 || abort "Missing required command: jq"

  parse_args "$@"

  local env_file
  env_file="$(resolve_path "$ENV_FILE_INPUT")"
  [[ -f "$env_file" ]] || abort "Environment file not found: $env_file"

  set -a
  # shellcheck source=/dev/null
  . "$env_file"
  set +a

  require_env "ONBOARD_TENANT_NAME"
  require_env "ONBOARD_OWNER_EMAIL"
  require_env "ONBOARD_OWNER_PASSWORD"

  local tenant_slug user_key tenant_key template_key api_client_ref
  tenant_slug="$(safe_slug "$ONBOARD_TENANT_NAME")"
  [[ -n "$tenant_slug" ]] || tenant_slug="customer"

  user_key="${ONBOARD_USER_KEY:-customer-owner-$tenant_slug}"
  tenant_key="${ONBOARD_TENANT_KEY:-customer-tenant-$tenant_slug}"
  template_key="${ONBOARD_TEMPLATE_KEY:-customer-template-$tenant_slug}"
  api_client_ref="${ONBOARD_API_CLIENT_REF:-customer-api-client-$tenant_slug}"

  local owner_name owner_role claim_assets_bucket tenant_api_key tenant_dek
  owner_name="${ONBOARD_OWNER_NAME:-${ONBOARD_OWNER_EMAIL%%@*}}"
  owner_role="${ONBOARD_OWNER_ROLE:-OWNER}"
  claim_assets_bucket="${ONBOARD_CLAIM_ASSETS_BUCKET:-claim-assets}"
  tenant_api_key="${ONBOARD_TENANT_API_KEY:-}"
  tenant_dek="${ONBOARD_TENANT_DEK:-$(random_hex_64)}"

  local template_name layout_variant template_status
  template_name="${ONBOARD_TEMPLATE_NAME:-$ONBOARD_TENANT_NAME Default Template}"
  layout_variant="${ONBOARD_TEMPLATE_LAYOUT_VARIANT:-order-cards}"
  template_status="${ONBOARD_TEMPLATE_STATUS:-DRAFT}"

  local template_publish template_is_default email_confirm
  template_publish="$(normalize_bool "${ONBOARD_TEMPLATE_PUBLISH:-true}")"
  template_is_default="$(normalize_bool "${ONBOARD_TEMPLATE_IS_DEFAULT:-true}")"
  email_confirm="$(normalize_bool "${ONBOARD_OWNER_EMAIL_CONFIRM:-true}")"

  local create_api_client api_client_name api_key
  create_api_client="$(normalize_bool "${ONBOARD_CREATE_API_CLIENT:-true}")"
  api_client_name="${ONBOARD_API_CLIENT_NAME:-$ONBOARD_TENANT_NAME API Client}"
  api_key="${ONBOARD_API_KEY:-dk_${tenant_slug}_$(random_token)}"

  local template_skus_json
  template_skus_json="$(csv_to_json_array "${ONBOARD_TEMPLATE_SKUS:-}")"

  local target_dir
  if [[ -n "$OUTPUT_DIR" ]]; then
    target_dir="$(resolve_path "$OUTPUT_DIR")"
    mkdir -p "$target_dir"
  else
    target_dir="$(mktemp -d "${TMPDIR:-/tmp}/injector-customer.XXXXXX")"
  fi

  mkdir -p \
    "$target_dir/users" \
    "$target_dir/tenants" \
    "$target_dir/tenant-members" \
    "$target_dir/claim-templates" \
    "$target_dir/api-clients"

  jq -cn \
    --arg key "$user_key" \
    --arg email "$ONBOARD_OWNER_EMAIL" \
    --arg password "$ONBOARD_OWNER_PASSWORD" \
    --arg name "$owner_name" \
    --argjson email_confirm "$email_confirm" \
    '{
      records: [
        {
          key: $key,
          email: $email,
          password: $password,
          emailConfirm: $email_confirm,
          userMetadata: { name: $name }
        }
      ]
    }' > "$target_dir/users/customer-users.json"

  jq -cn \
    --arg key "$tenant_key" \
    --arg name "$ONBOARD_TENANT_NAME" \
    --arg api_key "$tenant_api_key" \
    --arg bucket "$claim_assets_bucket" \
    --arg dek "$tenant_dek" \
    --arg tenant_id "${ONBOARD_TENANT_ID:-}" \
    '{
      records: [
        {
          key: $key,
          id: (if $tenant_id == "" then null else $tenant_id end),
          name: $name,
          apiKey: (if $api_key == "" then null else $api_key end),
          claimAssetsBucket: $bucket,
          dek: $dek
        }
      ]
    }' > "$target_dir/tenants/customer-tenants.json"

  jq -cn \
    --arg tenant_ref "$tenant_key" \
    --arg user_ref "$user_key" \
    --arg role "$owner_role" \
    '{
      records: [
        {
          tenantRef: $tenant_ref,
          userRef: $user_ref,
          role: $role
        }
      ]
    }' > "$target_dir/tenant-members/customer-tenant-members.json"

  jq -cn \
    --arg key "$template_key" \
    --arg tenant_ref "$tenant_key" \
    --arg name "$template_name" \
    --arg layout_variant "$layout_variant" \
    --arg status "$template_status" \
    --argjson publish "$template_publish" \
    --argjson is_default "$template_is_default" \
    --argjson skus "$template_skus_json" \
    '{
      records: [
        {
          key: $key,
          tenantRef: $tenant_ref,
          scopeType: "TENANT",
          name: $name,
          isDefault: $is_default,
          layoutVariant: $layout_variant,
          publish: $publish,
          status: $status,
          layoutConfig: {},
          brandingConfig: {},
          skus: $skus
        }
      ]
    }' > "$target_dir/claim-templates/customer-claim-templates.json"

  if [[ "$create_api_client" == "true" ]]; then
    jq -cn \
      --arg key "$api_client_ref" \
      --arg tenant_ref "$tenant_key" \
      --arg user_ref "$user_key" \
      --arg name "$api_client_name" \
      --arg api_key "$api_key" \
      --arg template_ref "$template_key" \
      '{
        records: [
          {
            key: $key,
            tenantRef: $tenant_ref,
            createdByUserRef: $user_ref,
            name: $name,
            apiKey: $api_key,
            defaultClaimTemplateRef: $template_ref
          }
        ]
      }' > "$target_dir/api-clients/customer-api-clients.json"
  fi

  log "Generated onboarding dataset in: $target_dir"
  log "Owner email: $ONBOARD_OWNER_EMAIL"
  log "Tenant: $ONBOARD_TENANT_NAME"
  if [[ "$create_api_client" == "true" ]]; then
    log "API key: $api_key"
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "Dry-run enabled. Injector execution skipped."
    exit 0
  fi

  log "Running injector customer baseline..."
  ENV_FILE="$env_file" \
    INJECTOR_DATASETS_DIR="$target_dir" \
    INJECTOR_PROFILE="customer" \
    INJECTOR_SKIP_API_STEPS=1 \
    bash "$INJECTOR_ROOT/injector.sh" customer
}

main "$@"
