#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Starting local Supabase stack"
npx -y supabase start

echo "[2/4] Resetting local database before E2E suite"
npx -y supabase db reset --local

echo "[3/4] Loading Supabase local environment"
supabase_env_output="$(npx -y supabase status -o env)"
supabase_env_exports="$(
  printf '%s\n' "$supabase_env_output" \
    | grep -E '^(API_URL|SERVICE_ROLE_KEY)=' \
    | sed 's/^/export /'
)"

if [[ -z "$supabase_env_exports" ]]; then
  echo "Could not parse API_URL/SERVICE_ROLE_KEY from 'supabase status -o env' output."
  exit 1
fi

eval "$supabase_env_exports"

: "${API_URL:?API_URL was not loaded from supabase status output.}"
: "${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY was not loaded from supabase status output.}"

export POS_BACKEND_MODE=supabase
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export PRODUCT_SOURCING_CARREFOUR_FIXTURE="${PRODUCT_SOURCING_CARREFOUR_FIXTURE:-tests/fixtures/product-sourcing/carrefour-search-response-local-fixture.json}"

echo "[4/4] Running UI E2E suite by module (real backend)"
npx playwright test --workers=1 "$@" \
  tests/e2e/ui-vertical-slices-smoke.spec.ts \
  tests/e2e/orders-ui-sales-snapshot.spec.ts \
  tests/e2e/products-workspace-ui.spec.ts \
  tests/e2e/product-sourcing-import-ui.spec.ts \
  tests/e2e/product-sourcing-category-mapping-ui.spec.ts \
  tests/e2e/product-sourcing-category-mapping-management-ui.spec.ts \
  tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts \
  tests/e2e/inventory-ui-stock-movement.spec.ts \
  tests/e2e/sales-ui-checkout-history-and-debt.spec.ts \
  tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts \
  tests/e2e/ar-ui-debt-candidates-sorting.spec.ts \
  tests/e2e/reporting-ui-filters-and-metrics.spec.ts \
  tests/e2e/reporting-ui-profit-cost-basis.spec.ts \
  tests/e2e/offline-debt-payment-recovery.spec.ts \
  tests/e2e/offline-sync-recovery.spec.ts
