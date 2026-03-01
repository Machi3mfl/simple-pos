# [API-001] Feature: API Contracts v1 and Mock Runtime

## Metadata

**Feature ID**: `API-001`  
**Status**: `done`  
**GitHub Issue**: #4  
**Priority**: `high`  
**Linked PBIs**: `PBI-003`, `PBI-008`, `PBI-004`, `PBI-010`  
**Linked FR/NFR**: `FR-007`, `FR-010`, `NFR-004`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`
**Contract Artifacts**: `src/app/api/v1/openapi.yaml`, `src/modules/*/presentation/dtos/*.ts`

---

## Business Goal

Keep `/api/v1` contracts stable while running the application against real Supabase persistence so catalog, stock, sales, debt, reporting, and sync flows behave consistently across modules.

## Use Case Summary

**Primary Actor**: frontend/mobile client  
**Trigger**: UI or automation requires stable versioned contracts backed by persistent storage
**Main Flow**:
1. Client calls versioned endpoint.
2. Supabase-backed runtime executes the use case and persists the result.
3. E2E validates user flow and detects contract drifts.

---

## API / Code Examples

```ts
export interface CreateStockMovementDTO {
  productId: string;
  movementType: "inbound" | "outbound" | "adjustment";
  quantity: number;
  unitCost?: number; // required when movementType = "inbound"
}
```

```yaml
paths:
  /api/v1/stock-movements:
    post:
      summary: Register stock movement
      requestBody:
        required: true
```

---

## Acceptance Criteria

- [x] OpenAPI/DTO contracts exist for all MVP endpoints.
- [x] Runtime contracts are validated against Supabase-backed flows.
- [x] Fixture-based tests fail when intercepted payloads diverge from schema.
- [x] Architecture guardrails catch invalid cross-layer imports.

## Current Output

- OpenAPI v1 skeleton: `src/app/api/v1/openapi.yaml`
- DTO baseline:
  - `src/modules/catalog/presentation/dtos/*.ts`
  - `src/modules/sales/presentation/dtos/*.ts`
  - `src/modules/inventory/presentation/dtos/*.ts`
  - `src/modules/reporting/presentation/dtos/*.ts`
  - `src/modules/customers/presentation/dtos/*.ts`
  - `src/modules/accounts-receivable/presentation/dtos/*.ts`
  - `src/modules/sync/presentation/dtos/*.ts`
- Supabase-backed endpoints implemented:
  - `src/app/api/v1/sales/route.ts`
  - `src/app/api/v1/stock-movements/route.ts`
  - `src/app/api/v1/products/route.ts`
  - `src/app/api/v1/products/price-batches/route.ts`
  - `src/app/api/v1/reports/top-products/route.ts`
  - `src/app/api/v1/reports/profit-summary/route.ts`
  - `src/app/api/v1/reports/sales-history/route.ts`
  - `src/app/api/v1/sync/events/route.ts`
- Supabase runtimes:
  - `src/modules/catalog/infrastructure/runtime/catalogRuntime.ts`
  - `src/modules/inventory/infrastructure/runtime/inventoryRuntime.ts`
  - `src/modules/reporting/infrastructure/runtime/reportingRuntime.ts`
  - `src/modules/sync/infrastructure/runtime/syncRuntime.ts`
- Fixture-based E2E still running against intercepted API where intentional:
  - `tests/e2e/pos-checkout-smoke.spec.ts`
  - `tests/e2e/ui-vertical-slices-smoke.spec.ts`
  - `tests/fixtures/mock-api/*.json`
- Contract conformance checks:
  - `tests/e2e/api-contract-conformance.spec.ts`
  - Request examples validated against DTO Zod schemas.
  - Mock fixtures validated against response/error schemas.
- Reporting API E2E coverage:
  - `tests/e2e/reporting-sales-history-and-profit-api.spec.ts`
  - Validates `top-products`, `sales-history`, and `profit-summary` contracts and query validation errors.
- Real-backend contract checks:
  - `tests/e2e/release-gate-real-backend.spec.ts`
  - `tests/e2e/sync-idempotency-and-retry-api.spec.ts`
  - Cover persisted `sales`, `stock-movements`, `reporting`, and `sync/events` flows.
- Architecture guardrails:
  - `.eslintrc.json` layer-boundary `no-restricted-imports` rules for `domain/application/presentation/infrastructure`.
  - `CreateSaleUseCase` no longer imports DTOs from `presentation`.
- Runtime baseline:
  - Application routes run on Supabase persistence only.
  - `sync/events` idempotency is persisted in `sync_events`.
  - Intercepted/mock fixtures remain test-only and are not used by app runtime.
- OpenAPI lint status: `pass` (`npx -y @redocly/cli@latest lint src/app/api/v1/openapi.yaml`)
