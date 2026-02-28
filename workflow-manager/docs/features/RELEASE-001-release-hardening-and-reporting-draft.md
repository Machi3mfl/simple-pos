# [RELEASE-001] Feature: Release Hardening and Reporting Baseline

## Metadata

**Feature ID**: `RELEASE-001`  
**Status**: `in_progress`  
**GitHub Issue**: `pending`  
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
  - `src/modules/reporting/infrastructure/runtime/reportingMockRuntime.ts`
- Reporting UI surface integrated:
  - `src/modules/reporting/presentation/components/ReportingPanel.tsx`
  - mounted from `src/modules/sales/presentation/components/PosLayout.tsx` (`Reporting`)
- Reporting API routes added:
  - `src/app/api/v1/reports/top-products/route.ts`
  - `src/app/api/v1/reports/profit-summary/route.ts`
  - `src/app/api/v1/reports/sales-history/route.ts`
- Reporting use cases:
  - `GetTopProductsReportUseCase`
  - `GetProfitSummaryReportUseCase`
  - `GetSalesHistoryReportUseCase`
- Sales repository now supports filtered listing for reporting:
  - `src/modules/sales/domain/repositories/SaleRepository.ts`
  - `src/modules/sales/infrastructure/repositories/InMemorySaleRepository.ts`
- Real-backend runtime switch for critical flows:
  - `POS_BACKEND_MODE=mock|supabase`
  - Supabase server client: `src/infrastructure/config/supabaseServer.ts`
  - Supabase repositories:
    - `src/modules/catalog/infrastructure/repositories/SupabaseProductRepository.ts`
    - `src/modules/inventory/infrastructure/repositories/SupabaseInventoryRepository.ts`
    - `src/modules/sales/infrastructure/repositories/SupabaseSaleRepository.ts`
- Contract updates:
  - `src/app/api/v1/openapi.yaml` (`/reports/sales-history`, `SalesHistoryResponse`)
  - reporting DTOs now use Zod schemas.
- Test evidence:
  - `tests/e2e/reporting-sales-history-and-profit-api.spec.ts`
  - `tests/e2e/reporting-ui-filters-and-metrics.spec.ts`
  - `tests/e2e/api-contract-conformance.spec.ts`
  - `tests/e2e/ui-vertical-slices-smoke.spec.ts`
  - `tests/e2e/release-gate-real-backend.spec.ts` (gated by `POS_BACKEND_MODE=supabase`)
  - Full suite result (`2026-02-28`): `30 passed`, `1 skipped` (Playwright mock mode).
  - Real-backend gate result (`2026-02-28`): `1 passed` (Playwright with local Supabase).
- Real-backend gate runbook and schema:
  - `workflow-manager/docs/runbooks/002-runbook-release-gate-real-backend-ready.md`
  - `supabase/migrations/20260228000000_simple_pos_core.sql`
