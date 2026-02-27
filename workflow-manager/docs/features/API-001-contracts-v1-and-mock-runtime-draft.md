# [API-001] Feature: API Contracts v1 and Mock Runtime

## Metadata

**Feature ID**: `API-001`  
**Status**: `in_progress`  
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

- [ ] OpenAPI/DTO contracts exist for all MVP endpoints.
- [ ] Mock runtime covers critical happy and error scenarios.
- [ ] Mock E2E fails when fixture contract diverges from schema.
- [ ] Architecture guardrails catch invalid cross-layer imports.

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
- Mock E2E running against intercepted API:
  - `tests/e2e/pos-checkout-smoke.spec.ts`
  - `tests/fixtures/mock-api/*.json`
- OpenAPI lint status: `pass` (`npx -y @redocly/cli@latest lint src/app/api/v1/openapi.yaml`)
