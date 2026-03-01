# UC to E2E Traceability Matrix

## Purpose

Provide a living map from implemented Use Cases (`UC-001..UC-009`) to the exact E2E test files that validate each case, including execution mode (`mock` vs `supabase`) and main API contracts touched by the flow.

## Update Rule

Whenever a use case scope, endpoint contract, or E2E scenario changes, this file must be updated in the same batch.

### UI E2E Definition

In this matrix, `UI E2E coverage` means the scenario is executed through user interactions in the interface (`page` actions). Some real-backend UI specs may pre-seed catalog records through `request.post` setup so the sales screen can start empty without demo data.

## Matrix

| UC | Functional scope | Main API contracts | UI E2E coverage | API/contract E2E coverage | Runtime mode |
| --- | --- | --- | --- | --- | --- |
| `UC-001` | Register POS checkout (`cash`/`on_account`) | `GET /api/v1/products`, `POST /api/v1/sales` | [tests/e2e/pos-checkout-smoke.spec.ts](../../../tests/e2e/pos-checkout-smoke.spec.ts), [tests/e2e/pos-layout-sections.spec.ts](../../../tests/e2e/pos-layout-sections.spec.ts), [tests/e2e/nfr-performance-usability.spec.ts](../../../tests/e2e/nfr-performance-usability.spec.ts), [tests/e2e/sales-ui-checkout-history-and-debt.spec.ts](../../../tests/e2e/sales-ui-checkout-history-and-debt.spec.ts) | [tests/e2e/mock-runtime-critical-scenarios.spec.ts](../../../tests/e2e/mock-runtime-critical-scenarios.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `mock` + `supabase` |
| `UC-002` | Guided product onboarding | `POST /api/v1/products`, `GET /api/v1/products` | [tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts](../../../tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts) | [tests/e2e/catalog-onboarding-api.spec.ts](../../../tests/e2e/catalog-onboarding-api.spec.ts) | `mock` + `supabase` |
| `UC-003` | Stock movement with inbound cost policy | `POST /api/v1/stock-movements`, `GET /api/v1/stock-movements` | [tests/e2e/inventory-ui-stock-movement.spec.ts](../../../tests/e2e/inventory-ui-stock-movement.spec.ts) | [tests/e2e/inventory-stock-movements-api.spec.ts](../../../tests/e2e/inventory-stock-movements-api.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `mock` + `supabase` |
| `UC-004` | Sales history and analytics, including per-order payment snapshot | `GET /api/v1/reports/sales-history`, `GET /api/v1/reports/top-products`, `GET /api/v1/reports/profit-summary` | [tests/e2e/reporting-ui-filters-and-metrics.spec.ts](../../../tests/e2e/reporting-ui-filters-and-metrics.spec.ts), [tests/e2e/reporting-ui-profit-cost-basis.spec.ts](../../../tests/e2e/reporting-ui-profit-cost-basis.spec.ts), [tests/e2e/sales-ui-checkout-history-and-debt.spec.ts](../../../tests/e2e/sales-ui-checkout-history-and-debt.spec.ts), [tests/e2e/orders-ui-sales-snapshot.spec.ts](../../../tests/e2e/orders-ui-sales-snapshot.spec.ts) | [tests/e2e/reporting-sales-history-and-profit-api.spec.ts](../../../tests/e2e/reporting-sales-history-and-profit-api.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `mock` + `supabase` |
| `UC-005` | Stable web/mobile API consumption (`/api/v1/*`) | Cross-module `api/v1` contracts | [tests/e2e/ui-vertical-slices-smoke.spec.ts](../../../tests/e2e/ui-vertical-slices-smoke.spec.ts) | [tests/e2e/api-contract-conformance.spec.ts](../../../tests/e2e/api-contract-conformance.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `mock` + `supabase` |
| `UC-006` | UI-first mock demo (no real backend dependency) | Mocked `api/v1` contracts | [tests/e2e/pos-checkout-smoke.spec.ts](../../../tests/e2e/pos-checkout-smoke.spec.ts), [tests/e2e/ui-vertical-slices-smoke.spec.ts](../../../tests/e2e/ui-vertical-slices-smoke.spec.ts) | [tests/e2e/mock-runtime-critical-scenarios.spec.ts](../../../tests/e2e/mock-runtime-critical-scenarios.spec.ts) | `mock` |
| `UC-007` | On-account debt accrual and payment settlement, including order-targeted partial payments | `POST /api/v1/sales`, `GET /api/v1/customers/{id}/debt`, `POST /api/v1/debt-payments` | [tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts](../../../tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts), [tests/e2e/ar-ui-debt-candidates-sorting.spec.ts](../../../tests/e2e/ar-ui-debt-candidates-sorting.spec.ts), [tests/e2e/sales-ui-checkout-history-and-debt.spec.ts](../../../tests/e2e/sales-ui-checkout-history-and-debt.spec.ts), [tests/e2e/orders-ui-sales-snapshot.spec.ts](../../../tests/e2e/orders-ui-sales-snapshot.spec.ts), [tests/e2e/offline-debt-payment-recovery.spec.ts](../../../tests/e2e/offline-debt-payment-recovery.spec.ts) | [tests/e2e/ar-debt-ledger-and-payments-api.spec.ts](../../../tests/e2e/ar-debt-ledger-and-payments-api.spec.ts), [tests/e2e/sales-on-account-customer-constraint-integration.spec.ts](../../../tests/e2e/sales-on-account-customer-constraint-integration.spec.ts) | `mock` + `supabase` |
| `UC-008` | Offline queue and synchronization | `POST /api/v1/sync/events` (plus queued sales/debt events) | [tests/e2e/offline-sync-recovery.spec.ts](../../../tests/e2e/offline-sync-recovery.spec.ts), [tests/e2e/offline-debt-payment-recovery.spec.ts](../../../tests/e2e/offline-debt-payment-recovery.spec.ts) | [tests/e2e/sync-idempotency-and-retry-api.spec.ts](../../../tests/e2e/sync-idempotency-and-retry-api.spec.ts) | `mock` + `supabase` |
| `UC-009` | Bulk price update with preview/apply | `POST /api/v1/products/price-batches` | [tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts](../../../tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts) | [tests/e2e/catalog-bulk-price-update-api.spec.ts](../../../tests/e2e/catalog-bulk-price-update-api.spec.ts) | `mock` + `supabase` |

## Real-Backend UI Module Suite

The baseline run that validates UI vertical slices against Supabase is:

- [tests/scripts/run-e2e-ui-real-modules.sh](../../../tests/scripts/run-e2e-ui-real-modules.sh)

This suite resets DB state before execution and intentionally keeps generated data after completion for manual verification.

Since `2026-03-01`, this suite explicitly creates products per scenario because the app no longer auto-seeds catalog data or preloads order-list items.
