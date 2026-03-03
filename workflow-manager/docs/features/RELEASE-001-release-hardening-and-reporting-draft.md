# [RELEASE-001] Feature: Release Hardening and Reporting Baseline

## Metadata

**Feature ID**: `RELEASE-001`  
**Status**: `done`  
**GitHub Issue**: #19  
**Priority**: `high`  
**Linked PBIs**: `PBI-013`, `PBI-011`, `PBI-012`  
**Linked FR/NFR**: `FR-005`, `FR-006`, `NFR-003`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`

---

## Business Goal

Close Iteration 6 with release-ready quality gates and reporting endpoints that provide sales history plus profit visibility using persisted weighted-average inventory cost basis.

## Use Case Summary

**Primary Actor**: owner/support admin  
**Trigger**: daily/weekly operational review and release readiness checks  
**Main Flow**:
1. Owner queries reporting endpoints (`sales-history`, `top-products`, `profit-summary`).
2. System returns contract-validated data with date/payment filters.
3. Team validates release quality gates (lint/build/openapi/e2e) before next milestone.

---

## API / Code Examples

```http
GET /api/v1/reports/sales-history?periodStart=2026-02-28&periodEnd=2026-02-28&paymentMethod=on_account
GET /api/v1/reports/top-products?periodStart=2026-02-28&periodEnd=2026-02-28
GET /api/v1/reports/profit-summary?periodStart=2026-02-28&periodEnd=2026-02-28
```

```ts
export interface SaleFilters {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly paymentMethod?: "cash" | "on_account";
}
```

---

## Acceptance Criteria

- [x] Reporting endpoints are available under `/api/v1/reports/*` with DTO/OpenAPI contract alignment.
- [x] Sales history supports date and payment method filters.
- [x] Profit summary uses persisted outbound stock movement cost basis.
- [x] Mock quality gates are green (`lint`, `build`, OpenAPI lint, full e2e suite).
- [x] Real-backend release gate is green for critical flows before production release.

## Current Output

- Reporting runtime added:
  - `src/modules/reporting/infrastructure/runtime/reportingRuntime.ts`
- Reporting UI surface integrated:
  - `src/modules/reporting/presentation/components/ReportingPanel.tsx`
  - `src/modules/reporting/presentation/components/OrdersPanel.tsx`
  - mounted from `src/modules/sales/presentation/components/PosLayout.tsx` (`Reporting`)
  - mounted from `src/modules/sales/presentation/components/PosLayout.tsx` (`Orders`)
  - `Reporting` now behaves as an executive dashboard instead of a simple history table, combining real sales, receivables, and product-workspace signals into one decision-support snapshot
  - the UI now exposes CEO-facing metric cards for sales count, revenue, cost, profit, gross margin, collected amount, current credit balance, stock value, debtor count, and open orders
  - the workspace now uses shadcn-style charts for daily trend, payment mix, inventory health, and top-product concentration
- Reporting API routes added:
  - `src/app/api/v1/reports/top-products/route.ts`
  - `src/app/api/v1/reports/profit-summary/route.ts`
  - `src/app/api/v1/reports/sales-history/route.ts`
  - `ReportingPanel` also consumes `GET /api/v1/products/workspace` and `GET /api/v1/receivables` to enrich the executive snapshot with live inventory and credit exposure
- Reporting use cases:
  - `GetTopProductsReportUseCase`
  - `GetProfitSummaryReportUseCase`
  - `GetSalesHistoryReportUseCase`
  - `GetSalesHistoryReportUseCase` now enriches each sale with `amountPaid`, `outstandingAmount`, and `paymentStatus`
- Sales repository now supports filtered listing for reporting:
  - `src/modules/sales/domain/repositories/SaleRepository.ts`
  - `src/modules/sales/infrastructure/repositories/SupabaseSaleRepository.ts`
- Real-backend persistence baseline for critical flows:
  - Supabase server client: `src/infrastructure/config/supabaseServer.ts`
  - Supabase repositories:
    - `src/modules/catalog/infrastructure/repositories/SupabaseProductRepository.ts`
    - `src/modules/inventory/infrastructure/repositories/SupabaseInventoryRepository.ts`
    - `src/modules/sales/infrastructure/repositories/SupabaseSaleRepository.ts`
    - `src/modules/customers/infrastructure/repositories/SupabaseCustomerRepository.ts`
    - `src/modules/accounts-receivable/infrastructure/repositories/SupabaseDebtLedgerRepository.ts`
    - `src/modules/sync/infrastructure/repositories/SupabaseSyncEventRepository.ts`
- Contract updates:
  - `src/app/api/v1/openapi.yaml` (`/reports/sales-history`, `SalesHistoryResponse`)
  - `src/app/api/v1/openapi.yaml` (`/sales`, `/debt-payments`, `SaleResponse`, `DebtPaymentResponse`)
  - reporting DTOs now use Zod schemas.
- Orders workspace now reuses `sales-history` as an operational snapshot focused on visual review and detail drill-down; debt settlement remains in `/receivables`.
- Quality gates revalidated (`2026-02-28`):
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npx -y @redocly/cli@latest lint src/app/api/v1/openapi.yaml` ✅
- Test evidence:
  - `tests/e2e/reporting-sales-history-and-profit-api.spec.ts`
  - `tests/e2e/reporting-ui-filters-and-metrics.spec.ts`
  - `tests/e2e/reporting-ui-profit-cost-basis.spec.ts`
  - `tests/e2e/orders-ui-sales-snapshot.spec.ts`
  - `tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts`
  - `tests/e2e/api-contract-conformance.spec.ts`
  - `tests/e2e/ui-vertical-slices-smoke.spec.ts`
  - `tests/e2e/release-gate-real-backend.spec.ts` (gated by `POS_BACKEND_MODE=supabase`)
  - `tests/e2e/sync-idempotency-and-retry-api.spec.ts`
  - Full suite result (`2026-02-28`): `30 passed`, `1 skipped` (Playwright mock mode).
  - Real-backend gate result (`2026-02-28`): `1 passed` (Playwright with local Supabase).
- Real-backend gate runbook and schema:
  - `workflow-manager/docs/runbooks/002-runbook-release-gate-real-backend-ready.md`
  - local bootstrap scripts:
    - `scripts/supabase/common.sh`
    - `scripts/supabase/start-local.sh`
    - `scripts/supabase/reset-local.sh`
    - `scripts/supabase/status-local.sh`
    - `scripts/supabase/stop-local.sh`
    - `scripts/supabase/write-local-env.sh`
    - `scripts/supabase/dev-local.sh`
  - `supabase/config.toml`
  - `supabase/migrations/20260228000000_simple_pos_core.sql`
  - `supabase/migrations/20260301000000_customers_and_debt_ledger.sql`
  - `supabase/migrations/20260301010000_sync_events.sql`
