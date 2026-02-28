#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Starting local Supabase stack"
npx -y supabase start

echo "[2/4] Resetting local database before E2E suite"
npx -y supabase db reset --local

echo "[3/4] Loading Supabase local environment"
eval "$(npx -y supabase status -o env | rg '^(API_URL|SERVICE_ROLE_KEY)=' | sed 's/^/export /')"

export POS_BACKEND_MODE=supabase
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

echo "[4/4] Running UI E2E suite by module (real backend)"
npx playwright test --workers=1 \
  tests/e2e/ui-vertical-slices-smoke.spec.ts \
  tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts \
  tests/e2e/inventory-ui-stock-movement.spec.ts \
  tests/e2e/sales-ui-checkout-history-and-debt.spec.ts \
  tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts \
  tests/e2e/reporting-ui-filters-and-metrics.spec.ts \
  tests/e2e/offline-sync-recovery.spec.ts
