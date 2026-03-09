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
| `UC-001` | Register POS checkout (`cash`/`on_account`) | `GET /api/v1/products`, `POST /api/v1/sales` | [tests/e2e/pos-checkout-smoke.spec.ts](../../../tests/e2e/pos-checkout-smoke.spec.ts), [tests/e2e/pos-layout-sections.spec.ts](../../../tests/e2e/pos-layout-sections.spec.ts), [tests/e2e/nfr-performance-usability.spec.ts](../../../tests/e2e/nfr-performance-usability.spec.ts), [tests/e2e/sales-ui-checkout-history-and-debt.spec.ts](../../../tests/e2e/sales-ui-checkout-history-and-debt.spec.ts), [tests/e2e/sales-catalog-infinite-scroll-ui.spec.ts](../../../tests/e2e/sales-catalog-infinite-scroll-ui.spec.ts), [tests/e2e/sales-catalog-alpha-index-ui.spec.ts](../../../tests/e2e/sales-catalog-alpha-index-ui.spec.ts), [tests/e2e/sales-catalog-scroll-to-top-ui.spec.ts](../../../tests/e2e/sales-catalog-scroll-to-top-ui.spec.ts), [tests/e2e/sales-catalog-category-integrity-ui.spec.ts](../../../tests/e2e/sales-catalog-category-integrity-ui.spec.ts), [tests/e2e/sales-order-item-remove-ui.spec.ts](../../../tests/e2e/sales-order-item-remove-ui.spec.ts), [tests/e2e/sales-order-summary-scroll-ui.spec.ts](../../../tests/e2e/sales-order-summary-scroll-ui.spec.ts), [tests/e2e/sales-checkout-toast-ui.spec.ts](../../../tests/e2e/sales-checkout-toast-ui.spec.ts), [tests/e2e/sales-checkout-modal-layout-ui.spec.ts](../../../tests/e2e/sales-checkout-modal-layout-ui.spec.ts) | [tests/e2e/mock-runtime-critical-scenarios.spec.ts](../../../tests/e2e/mock-runtime-critical-scenarios.spec.ts), [tests/e2e/cash-register-automatic-integrations-api.spec.ts](../../../tests/e2e/cash-register-automatic-integrations-api.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `mock` + `supabase` |
| `UC-002` | Guided product onboarding with canonical category entry, sourcing-first single-product creation, managed image ingestion, and EAN persistence/search | `POST /api/v1/products`, `GET /api/v1/products`, `GET /api/v1/products/workspace`, `POST /api/v1/product-sourcing/import` | [tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts](../../../tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts), [tests/e2e/products-workspace-ui.spec.ts](../../../tests/e2e/products-workspace-ui.spec.ts), [tests/e2e/product-sourcing-import-ui.spec.ts](../../../tests/e2e/product-sourcing-import-ui.spec.ts) | [tests/e2e/catalog-onboarding-api.spec.ts](../../../tests/e2e/catalog-onboarding-api.spec.ts), [tests/e2e/product-sourcing-import-use-case.spec.ts](../../../tests/e2e/product-sourcing-import-use-case.spec.ts) | `mock` + `supabase` |
| `UC-003` | Stock movement with inbound cost policy | `POST /api/v1/stock-movements`, `GET /api/v1/stock-movements` | [tests/e2e/inventory-ui-stock-movement.spec.ts](../../../tests/e2e/inventory-ui-stock-movement.spec.ts) | [tests/e2e/inventory-stock-movements-api.spec.ts](../../../tests/e2e/inventory-stock-movements-api.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `mock` + `supabase` |
| `UC-004` | Sales history and executive analytics, including per-order payment snapshot plus current inventory/credit position | `GET /api/v1/reports/sales-history`, `GET /api/v1/reports/top-products`, `GET /api/v1/reports/profit-summary`, `GET /api/v1/products/workspace`, `GET /api/v1/receivables` | [tests/e2e/reporting-ui-filters-and-metrics.spec.ts](../../../tests/e2e/reporting-ui-filters-and-metrics.spec.ts), [tests/e2e/reporting-ui-profit-cost-basis.spec.ts](../../../tests/e2e/reporting-ui-profit-cost-basis.spec.ts), [tests/e2e/sales-ui-checkout-history-and-debt.spec.ts](../../../tests/e2e/sales-ui-checkout-history-and-debt.spec.ts), [tests/e2e/orders-ui-sales-snapshot.spec.ts](../../../tests/e2e/orders-ui-sales-snapshot.spec.ts) | [tests/e2e/reporting-sales-history-and-profit-api.spec.ts](../../../tests/e2e/reporting-sales-history-and-profit-api.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `mock` + `supabase` |
| `UC-005` | Stable web/mobile API consumption (`/api/v1/*`) | Cross-module `api/v1` contracts | [tests/e2e/ui-vertical-slices-smoke.spec.ts](../../../tests/e2e/ui-vertical-slices-smoke.spec.ts) | [tests/e2e/api-contract-conformance.spec.ts](../../../tests/e2e/api-contract-conformance.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `mock` + `supabase` |
| `UC-006` | UI-first mock demo (no real backend dependency) | Mocked `api/v1` contracts | [tests/e2e/pos-checkout-smoke.spec.ts](../../../tests/e2e/pos-checkout-smoke.spec.ts), [tests/e2e/ui-vertical-slices-smoke.spec.ts](../../../tests/e2e/ui-vertical-slices-smoke.spec.ts) | [tests/e2e/mock-runtime-critical-scenarios.spec.ts](../../../tests/e2e/mock-runtime-critical-scenarios.spec.ts) | `mock` |
| `UC-007` | On-account debt accrual and payment settlement, including debtor snapshot listing, order-targeted partial payments, and modal settlement from `/receivables` | `POST /api/v1/sales`, `GET /api/v1/customers`, `GET /api/v1/receivables`, `GET /api/v1/customers/{id}/debt`, `POST /api/v1/debt-payments` | [tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts](../../../tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts), [tests/e2e/ar-ui-debt-candidates-sorting.spec.ts](../../../tests/e2e/ar-ui-debt-candidates-sorting.spec.ts), [tests/e2e/sales-ui-checkout-history-and-debt.spec.ts](../../../tests/e2e/sales-ui-checkout-history-and-debt.spec.ts), [tests/e2e/orders-ui-sales-snapshot.spec.ts](../../../tests/e2e/orders-ui-sales-snapshot.spec.ts), [tests/e2e/offline-debt-payment-recovery.spec.ts](../../../tests/e2e/offline-debt-payment-recovery.spec.ts) | [tests/e2e/ar-debt-ledger-and-payments-api.spec.ts](../../../tests/e2e/ar-debt-ledger-and-payments-api.spec.ts), [tests/e2e/sales-on-account-customer-constraint-integration.spec.ts](../../../tests/e2e/sales-on-account-customer-constraint-integration.spec.ts), [tests/e2e/customers-search-api.spec.ts](../../../tests/e2e/customers-search-api.spec.ts) | `mock` + `supabase` |
| `UC-008` | Offline queue and synchronization | `POST /api/v1/sync/events` (plus queued sales/debt events) | [tests/e2e/offline-sync-recovery.spec.ts](../../../tests/e2e/offline-sync-recovery.spec.ts), [tests/e2e/offline-debt-payment-recovery.spec.ts](../../../tests/e2e/offline-debt-payment-recovery.spec.ts) | [tests/e2e/sync-idempotency-and-retry-api.spec.ts](../../../tests/e2e/sync-idempotency-and-retry-api.spec.ts) | `mock` + `supabase` |
| `UC-009` | Bulk price update with preview/apply, including infinite-scroll product selection for large scopes and modes `percentage`/`fixed_amount`/`set_price` | `POST /api/v1/products/price-batches` | [tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts](../../../tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts), [tests/e2e/products-workspace-ui.spec.ts](../../../tests/e2e/products-workspace-ui.spec.ts), [tests/e2e/bulk-price-selection-infinite-scroll-ui.spec.ts](../../../tests/e2e/bulk-price-selection-infinite-scroll-ui.spec.ts) | [tests/e2e/catalog-bulk-price-update-api.spec.ts](../../../tests/e2e/catalog-bulk-price-update-api.spec.ts) | `mock` + `supabase` |
| `UC-010` | Unified products and inventory workspace (`/products`) with reusable infinite-scroll product listing, default `stock ascendente` ordering plus explicit `stock descendente`, EAN-aware search/detail, overflow admin actions, managed image replacement in edit flows, and bulk profile editing modal | `GET /api/v1/products/workspace`, `POST /api/v1/products`, `PATCH /api/v1/products/{id}`, `POST /api/v1/products/price-batches`, `POST /api/v1/products/import`, `POST /api/v1/stock-movements`, `POST /api/v1/stock-movements/import` | [tests/e2e/products-workspace-ui.spec.ts](../../../tests/e2e/products-workspace-ui.spec.ts), [tests/e2e/products-workspace-infinite-scroll-ui.spec.ts](../../../tests/e2e/products-workspace-infinite-scroll-ui.spec.ts), [tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts](../../../tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts), [tests/e2e/inventory-ui-stock-movement.spec.ts](../../../tests/e2e/inventory-ui-stock-movement.spec.ts), [tests/e2e/ui-vertical-slices-smoke.spec.ts](../../../tests/e2e/ui-vertical-slices-smoke.spec.ts) | [tests/e2e/products-workspace-api.spec.ts](../../../tests/e2e/products-workspace-api.spec.ts), [tests/e2e/products-workspace-orchestration-unit.spec.ts](../../../tests/e2e/products-workspace-orchestration-unit.spec.ts), [tests/e2e/release-gate-real-backend.spec.ts](../../../tests/e2e/release-gate-real-backend.spec.ts) | `supabase` |
| `UC-011` | External product sourcing and assisted import (`/products/sourcing`) with shared shell navigation, a 3-step wizard (`search/select` -> `adjust data` -> `confirm/import`), header badges for visible-results/selected-count context, direct image-inspection modal access from step-1 search cards, modal access to failed queue/history/category mappings, explicit `Mostrar más resultados` pagination in place of auto-scroll loading, managed image persistence, source traceability, canonical category entry, persisted category mapping reuse/management, a step-2 zero-stock warning before final review with per-item highlighting for affected drafts, hardened provider access, responsive tablet/mobile validation, actionable partial-failure handling, resume-state recovery across reloads, and a persistent failed-import queue across sessions | `GET /api/v1/product-sourcing/search`, `POST /api/v1/product-sourcing/import`, `GET/PATCH/DELETE /api/v1/product-sourcing/category-mappings`, `GET /api/v1/product-sourcing/import-history` | [tests/e2e/product-sourcing-ui.spec.ts](../../../tests/e2e/product-sourcing-ui.spec.ts), [tests/e2e/product-sourcing-resume-state-ui.spec.ts](../../../tests/e2e/product-sourcing-resume-state-ui.spec.ts), [tests/e2e/product-sourcing-failed-queue-ui.spec.ts](../../../tests/e2e/product-sourcing-failed-queue-ui.spec.ts), [tests/e2e/product-sourcing-responsive-ui.spec.ts](../../../tests/e2e/product-sourcing-responsive-ui.spec.ts), [tests/e2e/product-sourcing-import-ui.spec.ts](../../../tests/e2e/product-sourcing-import-ui.spec.ts), [tests/e2e/product-sourcing-category-mapping-ui.spec.ts](../../../tests/e2e/product-sourcing-category-mapping-ui.spec.ts), [tests/e2e/product-sourcing-category-mapping-management-ui.spec.ts](../../../tests/e2e/product-sourcing-category-mapping-management-ui.spec.ts) | [tests/e2e/product-sourcing-search-use-case.spec.ts](../../../tests/e2e/product-sourcing-search-use-case.spec.ts), [tests/e2e/product-sourcing-carrefour-provider.spec.ts](../../../tests/e2e/product-sourcing-carrefour-provider.spec.ts), [tests/e2e/product-sourcing-search-handler.spec.ts](../../../tests/e2e/product-sourcing-search-handler.spec.ts), [tests/e2e/product-sourcing-import-use-case.spec.ts](../../../tests/e2e/product-sourcing-import-use-case.spec.ts), [tests/e2e/product-sourcing-category-mappings-use-cases.spec.ts](../../../tests/e2e/product-sourcing-category-mappings-use-cases.spec.ts), [tests/e2e/product-sourcing-import-history-use-case.spec.ts](../../../tests/e2e/product-sourcing-import-history-use-case.spec.ts), [tests/e2e/product-sourcing-provider-hardening.spec.ts](../../../tests/e2e/product-sourcing-provider-hardening.spec.ts) | `mock` + `supabase` |

## Cross-cutting Access Control Bootstrap

`POS-002 Slice 0` introduces shared identity/permission bootstrap contracts that cut across the functional use cases above.

- Main contracts:
  - `GET /api/v1/me`
  - `GET /api/v1/app-users`
  - `POST /api/v1/me/assume-user`
  - `DELETE /api/v1/me/assume-user`
- Coverage:
  - UI: [tests/e2e/access-control-shell-ui.spec.ts](../../../tests/e2e/access-control-shell-ui.spec.ts)
  - API/contract: [tests/e2e/access-control-api.spec.ts](../../../tests/e2e/access-control-api.spec.ts)
- Runtime mode:
  - `mock` + `supabase`

## Cash Register Session Core

`POS-002 Slice 1` introduces the first real drawer workflow inside `/cash-register`, so checkout no longer depends only on a conceptual "POS session is open" precondition.

- Main contracts:
  - `GET /api/v1/cash-registers`
  - `GET /api/v1/cash-registers/{id}/active-session`
  - `POST /api/v1/cash-register-sessions`
  - `POST /api/v1/cash-register-sessions/{id}/close`
- Coverage:
  - UI: [tests/e2e/cash-register-session-ui.spec.ts](../../../tests/e2e/cash-register-session-ui.spec.ts)
  - API/contract: [tests/e2e/cash-register-session-api.spec.ts](../../../tests/e2e/cash-register-session-api.spec.ts)
- Runtime mode:
  - `supabase`
- E2E auth posture:
  - Playwright bootstraps demo auth users in `globalSetup` and runs with authenticated fixtures by default (no `POS_ALLOW_GUEST_WORKSPACES` runtime bypass in the webServer command).

## Workspace Guardrails and Read-Model Redaction

`POS-002 Slice 2` extends the same permission snapshot into existing workspaces so operational roles can keep safe read paths without inheriting strategic or sensitive detail.

- Main contracts:
  - `GET /api/v1/me`
  - `GET /api/v1/reports/sales-history`
  - `GET /api/v1/reports/top-products`
  - `GET /api/v1/reports/profit-summary`
  - `GET /api/v1/products/workspace`
  - `GET /api/v1/receivables`
- Coverage:
  - UI: [tests/e2e/access-control-shell-ui.spec.ts](../../../tests/e2e/access-control-shell-ui.spec.ts), [tests/e2e/orders-ui-sales-snapshot.spec.ts](../../../tests/e2e/orders-ui-sales-snapshot.spec.ts), [tests/e2e/reporting-ui-filters-and-metrics.spec.ts](../../../tests/e2e/reporting-ui-filters-and-metrics.spec.ts)
  - API/contract: [tests/e2e/access-control-api.spec.ts](../../../tests/e2e/access-control-api.spec.ts)
- Runtime mode:
  - `mock` + `supabase`

## Cash Movement Ledger

`POS-002 Slice 3` extends the drawer workflow with manual cash ledger events and a richer active-session read model.

- Main contracts:
  - `GET /api/v1/cash-registers/{id}/active-session`
  - `POST /api/v1/cash-register-sessions/{id}/movements`
- Coverage:
  - UI: [tests/e2e/cash-register-session-ui.spec.ts](../../../tests/e2e/cash-register-session-ui.spec.ts)
  - API/contract: [tests/e2e/cash-register-session-api.spec.ts](../../../tests/e2e/cash-register-session-api.spec.ts), [tests/e2e/api-contract-conformance.spec.ts](../../../tests/e2e/api-contract-conformance.spec.ts)
- Runtime mode:
  - `supabase`

## Automatic Cash Integrations

`POS-002 Slice 4` ties the active drawer session to checkout and receivables so collected cash becomes a first-class ledger event instead of an implicit side effect.

- Main contracts:
  - `POST /api/v1/sales`
  - `POST /api/v1/debt-payments`
  - `GET /api/v1/cash-registers/{id}/active-session`
- Coverage:
  - UI: [tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts](../../../tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts)
- API/contract: [tests/e2e/cash-register-automatic-integrations-api.spec.ts](../../../tests/e2e/cash-register-automatic-integrations-api.spec.ts)
- Runtime mode:
  - `supabase`

## Historical Business-Date Backfill

`POS-002 Slice 12` lets higher-trust operators open a drawer with a historical business date and reuses that operational day automatically for sales created from the active drawer.

- Main contracts:
  - `GET /api/v1/me`
  - `POST /api/v1/cash-register-sessions`
  - `POST /api/v1/sales`
  - `GET /api/v1/cash-registers/{id}/active-session`
- Coverage:
  - UI: [tests/e2e/cash-register-session-ui.spec.ts](../../../tests/e2e/cash-register-session-ui.spec.ts)
  - API/contract: [tests/e2e/access-control-api.spec.ts](../../../tests/e2e/access-control-api.spec.ts), [tests/e2e/cash-register-session-api.spec.ts](../../../tests/e2e/cash-register-session-api.spec.ts), [tests/e2e/cash-register-automatic-integrations-api.spec.ts](../../../tests/e2e/cash-register-automatic-integrations-api.spec.ts)
- Runtime mode:
  - `supabase`

## Discrepancy Approval and Business Authorization

`POS-002 Slice 5` extends closeout with a tolerance policy, review-required state, and higher-trust approval so a cashier does not silently close a drawer with a material difference.

- Main contracts:
  - `POST /api/v1/cash-register-sessions/{id}/close`
  - `POST /api/v1/cash-register-sessions/{id}/approve-closeout`
  - `POST /api/v1/cash-register-sessions/{id}/reopen`
  - `GET /api/v1/me`
- Coverage:
  - UI: [tests/e2e/cash-register-session-ui.spec.ts](../../../tests/e2e/cash-register-session-ui.spec.ts)
  - API/contract: [tests/e2e/access-control-api.spec.ts](../../../tests/e2e/access-control-api.spec.ts), [tests/e2e/cash-register-session-api.spec.ts](../../../tests/e2e/cash-register-session-api.spec.ts)
- Runtime mode:
  - `supabase`

## Role Catalog and Permission Composition

`POS-002 Slice 6` adds the first business-configurable role administration workflow so `system_admin` can adapt role bundles without changing code while preserving server-enforced permission checks.

- Main contracts:
  - `GET /api/v1/access-control/workspace`
  - `POST /api/v1/access-control/roles`
  - `PUT /api/v1/access-control/roles/{id}`
  - `DELETE /api/v1/access-control/roles/{id}`
  - `PUT /api/v1/access-control/users/{id}/roles`
  - `GET /api/v1/me`
- Coverage:
  - UI: [tests/e2e/access-control-role-admin-ui.spec.ts](../../../tests/e2e/access-control-role-admin-ui.spec.ts)
  - API/contract: [tests/e2e/access-control-role-admin-api.spec.ts](../../../tests/e2e/access-control-role-admin-api.spec.ts)
- Runtime mode:
  - `supabase`

## Hardening and Auth-Scoped Actor Resolution

`POS-002 Slice 7` hardens the temporary actor bridge by preferring real request-scoped auth when available and adds offline replay support for manual cash movements only, keeping open/close flows online-first.

- Main contracts:
  - `GET /api/v1/me`
  - `POST /api/v1/me/assume-user`
  - `DELETE /api/v1/me/assume-user`
  - `POST /api/v1/sync/events`
  - `POST /api/v1/cash-register-sessions/{id}/movements`
- Coverage:
  - UI: [tests/e2e/access-control-shell-ui.spec.ts](../../../tests/e2e/access-control-shell-ui.spec.ts), [tests/e2e/offline-cash-movement-recovery.spec.ts](../../../tests/e2e/offline-cash-movement-recovery.spec.ts)
  - API/contract: [tests/e2e/access-control-api.spec.ts](../../../tests/e2e/access-control-api.spec.ts)
- Runtime mode:
  - `supabase`

## Real Login UI Checkpoint

`POS-002 Slice 8` adds the first browser-visible Supabase Auth flow on top of the existing actor model so operators can enter with email/password, land on their allowed workspace, and close the session again without relying on the temporary support bridge.

- Main contracts:
  - `GET /api/v1/me`
  - `GET /api/v1/app-users`
  - Supabase Auth browser sign-in/sign-out flow over the existing `app_users.auth_user_id` mapping
- Coverage:
  - UI: [tests/e2e/access-control-login-ui.spec.ts](../../../tests/e2e/access-control-login-ui.spec.ts), [tests/e2e/access-control-shell-ui.spec.ts](../../../tests/e2e/access-control-shell-ui.spec.ts)
  - API/contract: [tests/e2e/access-control-api.spec.ts](../../../tests/e2e/access-control-api.spec.ts)
- Runtime mode:
  - `supabase`

## Real Credential Provisioning for `app_users`

`POS-002 Slice 9` closes the admin loop over real login by letting `system_admin` provision or repair Supabase Auth credentials for existing business users directly from `/users-admin`.

- Main contracts:
  - `GET /api/v1/access-control/workspace`
  - `POST /api/v1/access-control/users/{id}/auth-credentials`
  - `GET /api/v1/me`
  - `/login` browser sign-in over the provisioned `app_users.auth_user_id` link
- Coverage:
  - UI: [tests/e2e/access-control-credentials-admin-ui.spec.ts](../../../tests/e2e/access-control-credentials-admin-ui.spec.ts)
  - API/contract: [tests/e2e/access-control-credentials-admin-api.spec.ts](../../../tests/e2e/access-control-credentials-admin-api.spec.ts)
- Runtime mode:
  - `supabase`

## Auth-required Runtime and Controlled Support Delegation

`POS-002 Slice 10` removes the support bridge from the default operator path, requires real login for runtime workspaces, and leaves support impersonation available only after authenticated `system_admin` entry. The injector now reprovisions demo auth users so protected seeding still works without reopening guest access.

- Main contracts:
  - `GET /api/v1/me`
  - `GET /api/v1/app-users`
  - `POST /api/v1/me/assume-user`
  - `DELETE /api/v1/me/assume-user`
- Coverage:
  - UI: [tests/e2e/access-control-login-ui.spec.ts](../../../tests/e2e/access-control-login-ui.spec.ts), [tests/e2e/access-control-shell-ui.spec.ts](../../../tests/e2e/access-control-shell-ui.spec.ts), [tests/e2e/access-control-credentials-admin-ui.spec.ts](../../../tests/e2e/access-control-credentials-admin-ui.spec.ts), [tests/e2e/cash-register-session-ui.spec.ts](../../../tests/e2e/cash-register-session-ui.spec.ts)
  - API/contract: [tests/e2e/access-control-api.spec.ts](../../../tests/e2e/access-control-api.spec.ts), [tests/e2e/access-control-role-admin-api.spec.ts](../../../tests/e2e/access-control-role-admin-api.spec.ts), [tests/e2e/cash-register-session-api.spec.ts](../../../tests/e2e/cash-register-session-api.spec.ts)
- Runtime mode:
  - `supabase`

## Users-Admin Cash Register Catalog and Assignment

`POS-002 Slice 11` extends `/users-admin` so support/admin operators can manage the register catalog and assign drawers to users from the same access-control workspace.

- Main contracts:
  - `GET /api/v1/access-control/workspace`
  - `POST /api/v1/access-control/cash-registers`
  - `PUT /api/v1/access-control/cash-registers/{id}`
  - `PUT /api/v1/access-control/users/{id}/cash-registers`
- Coverage:
  - UI: [tests/e2e/access-control-role-admin-ui.spec.ts](../../../tests/e2e/access-control-role-admin-ui.spec.ts)
  - API/contract: [tests/e2e/access-control-role-admin-api.spec.ts](../../../tests/e2e/access-control-role-admin-api.spec.ts)
- Runtime mode:
  - `supabase`

## Real-Backend UI Module Suite

The baseline run that validates UI vertical slices against Supabase is:

- [tests/scripts/run-e2e-ui-real-modules.sh](../../../tests/scripts/run-e2e-ui-real-modules.sh)

This suite resets DB state before execution and intentionally keeps generated data after completion for manual verification.

Since `2026-03-01`, this suite explicitly creates products per scenario because the app no longer auto-seeds catalog data or preloads order-list items.

The sourcing subset now runs with `PRODUCT_SOURCING_CARREFOUR_FIXTURE` so real-backend UI validation stays deterministic without depending on Carrefour live availability.

Since `2026-03-01`, the UI E2E assertions for headings, actions, and feedback validate the Spanish i18n layer mounted in `src/app/layout.tsx`.

Since `2026-03-01`, `/products` is no longer a UI-only mock: [tests/e2e/products-workspace-ui.spec.ts](../../../tests/e2e/products-workspace-ui.spec.ts) covers the real workspace against Supabase and [tests/e2e/ui-vertical-slices-smoke.spec.ts](../../../tests/e2e/ui-vertical-slices-smoke.spec.ts) keeps the navigation smoke.

Since `2026-03-01`, the UI suite no longer exercises `/catalog` or `/inventory`; the converged runtime is validated directly through `/products`.

Since `2026-03-06`, sourcing UI coverage also validates the guided wizard shell: the operator now searches and selects in step 1, can inspect a larger product image directly from the search grid before selecting it, edits final catalog fields in step 2, gets an explicit warning before continuing when selected items still have `stock inicial = 0`, sees the affected draft cards highlighted in-line when some of them also keep `cost` empty, confirms/imports in step 3, and opens failed queue/history/category mappings from header modals instead of keeping all those surfaces inline in the main page. The same suite also validates the compact header badges for `resultados visibles` and highlighted `seleccionados`, plus cleanup of the persisted search snapshot after a fully successful import.

Since `2026-03-01`, sourcing is also part of the vertical-slice story: [tests/e2e/product-sourcing-import-ui.spec.ts](../../../tests/e2e/product-sourcing-import-ui.spec.ts) validates `/products -> /products/sourcing -> import -> /products -> /cash-register` against Supabase with mocked external search results, and asserts that the imported product image is served from managed Supabase storage instead of the original external hotlink.

Since `2026-03-03`, `/products` also treats `EAN` as a first-class catalog field: real-backend coverage now validates search by `EAN`, sourcing-to-catalog `EAN` propagation, and the sourcing-first `Nuevo producto` CTA that replaces the older standalone `Buscar afuera` button.

Since `2026-03-02`, checkout success/error feedback also has explicit UI validation through [tests/e2e/sales-checkout-toast-ui.spec.ts](../../../tests/e2e/sales-checkout-toast-ui.spec.ts), covering the floating shadcn toast styling path and the 10-second visibility requirement.

Since `2026-03-02`, the `on_account` checkout path requires explicit customer selection or explicit confirmed customer creation, now surfaced through a shadcn autocomplete dropdown for recent/live customer matches, and this behavior is exercised by the existing UI flows in [tests/e2e/pos-checkout-smoke.spec.ts](../../../tests/e2e/pos-checkout-smoke.spec.ts), [tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts](../../../tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts), and [tests/e2e/sales-ui-checkout-history-and-debt.spec.ts](../../../tests/e2e/sales-ui-checkout-history-and-debt.spec.ts).

Since `2026-03-02`, the real-backend regression set also validates that `/api/v1/customers` immediately surfaces newly created on-account customers and that the `/cash-register` catalog collapses legacy `snack`/`snacks` aliases into a single visible category chip.

Since `2026-03-03`, the canonical checkout workspace route is `/cash-register`; the recorded-sales snapshot now lives at `/sales`, while `/orders` remains only as a legacy redirect so old bookmarks still land on the new sales-history surface.

Since `2026-03-03`, [tests/e2e/orders-ui-sales-snapshot.spec.ts](../../../tests/e2e/orders-ui-sales-snapshot.spec.ts) validates the redesigned `/sales` snapshot flow through clickable sale cards and the new detail modal backed by `sales-history.saleItems`; direct payment registration is no longer performed from `/sales`.

Since `2026-03-03`, `UC-007` also validates the redesigned `/receivables` snapshot workspace: debtors are discovered from `GET /api/v1/receivables`, filtered from a card list, and settled inside a centered modal backed by the enriched `GET /api/v1/customers/{id}/debt` response, which now includes order-level item detail with product imagery for each pending sale.

Since `2026-03-03`, `UC-004` also validates the redesigned `/reporting` executive dashboard, which blends `sales-history`, `top-products`, `profit-summary`, `products/workspace`, and `receivables` into a single CEO-facing snapshot with charts, current-credit visibility, and inventory-health metrics.

Since `2026-03-06`, `UC-010` also tracks the products workspace sort-contract refinement: the workspace now defaults to `stock ascendente`, exposes explicit `stock_desc` ordering in the API/UI contract, and keeps a denser three-cards-per-row tablet grid.

Since `2026-03-06`, `UC-011` now paginates sourcing search results through an explicit `Mostrar más resultados` button instead of auto-loading on scroll, preserving access to the lower confirmation controls during long search sessions.

Since `2026-03-03`, the cross-cutting actor bootstrap of `POS-002 Slice 0` is also part of traceability: the app now exposes real operator selection, `/api/v1/me` permission snapshots, workspace-level blocked states, and first 403 guards across checkout, receivables, products, inventory, reporting, and sourcing.

Since `2026-03-03`, `POS-002 Slice 1` is also part of the real-backend workflow: `/cash-register` now includes a register-session panel with selector, opening float capture, active-session summary, and counted closeout modal backed by the new cash-session contracts.

Since `2026-03-03`, `POS-002 Slice 2` is also part of traceability: `/sales` now keeps a summary-only mode for operators without `sales_history.view_all_registers`, `/api/v1/reports/sales-history` redacts customer/detail payloads server-side for those roles, and `/reporting` now exposes an operational subset for `shift_supervisor` while hiding margin, credit exposure, and inventory-value blocks without the corresponding strategic permissions.

Since `2026-03-03`, `POS-002 Slice 3` is also part of the real-backend workflow: `/cash-register` now shows the active-session ledger, `GET /api/v1/cash-registers/{id}/active-session` returns movement detail with actor attribution, and `POST /api/v1/cash-register-sessions/{id}/movements` updates the expected drawer balance for manual ingress/egress flows.

Since `2026-03-03`, `POS-002 Slice 4` is also part of the real-backend workflow: `POST /api/v1/sales` now appends `cash_sale` for collected cash, `POST /api/v1/debt-payments` now appends `debt_payment_cash` for receivables payments collected into the active drawer, and both `/cash-register` and the receivables modal now surface the updated expected balance in the same operator workflow.

Since `2026-03-04`, `POS-002 Slice 5` is also part of the real-backend workflow: `POST /api/v1/cash-register-sessions/{id}/close` now leaves high-discrepancy closeouts in `closing_review_required`, `POST /api/v1/cash-register-sessions/{id}/approve-closeout` finalizes them under a higher-trust actor, `POST /api/v1/cash-register-sessions/{id}/reopen` returns them to recount, and `/cash-register` exposes the corresponding supervisor review UI.
