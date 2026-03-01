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

Define stable `/api/v1` contracts early and run the UI against a mocked runtime so demos and E2E can progress before full backend completion.

## Use Case Summary

**Primary Actor**: frontend/mobile client  
**Trigger**: UI requires data/actions before full backend exists  
**Main Flow**:
1. Client calls versioned endpoint.
2. Mock adapter returns deterministic response following DTO schema.
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
- [x] Mock runtime covers critical happy and error scenarios.
- [x] Mock E2E fails when fixture contract diverges from schema.
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
- Mock runtime endpoint implemented:
  - `src/app/api/v1/sales/route.ts`
  - `src/app/api/v1/stock-movements/route.ts`
  - `src/app/api/v1/reports/top-products/route.ts`
  - `src/app/api/v1/reports/profit-summary/route.ts`
  - `src/app/api/v1/reports/sales-history/route.ts`
  - `src/app/api/v1/sync/events/route.ts`
- Mock E2E running against intercepted API:
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
- Mock runtime critical-scenario API checks:
  - `tests/e2e/mock-runtime-critical-scenarios.spec.ts`
  - Covers `sales`, `stock-movements`, and `sync/events` happy/error paths.
- Architecture guardrails:
  - `.eslintrc.json` layer-boundary `no-restricted-imports` rules for `domain/application/presentation/infrastructure`.
  - `CreateSaleUseCase` no longer imports DTOs from `presentation`.
- Runtime mode switch prepared for release gate:
  - `POS_BACKEND_MODE=mock|supabase` with mock as default.
  - Supabase repositories available for `products`, `stock-movements`, and `sales`.
  - Mock repositories now share a process-global store so module navigation keeps the same mock data during a running session.
  - Mock mode is still non-durable across server restarts; persistent validation requires `POS_BACKEND_MODE=supabase`.
- OpenAPI lint status: `pass` (`npx -y @redocly/cli@latest lint src/app/api/v1/openapi.yaml`)
