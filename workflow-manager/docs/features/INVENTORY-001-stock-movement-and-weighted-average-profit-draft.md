# [INVENTORY-001] Feature: Stock Movement and Weighted-Average Profit Basis

## Metadata

**Feature ID**: `INVENTORY-001`  
**Status**: `done`  
**GitHub Issue**: #6  
**Priority**: `high`  
**Linked PBIs**: `PBI-009`, `PBI-012`  
**Linked FR/NFR**: `FR-004`, `FR-006`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`
**Architecture Artifacts**: `workflow-manager/docs/planning/diagrams/class-mvp-domain.md`

---

## Business Goal

Maintain reliable stock traceability and calculate baseline profit using the selected policy: `weighted_average`.

## Use Case Summary

**Primary Actor**: support admin  
**Trigger**: inbound/outbound/adjustment movement  
**Main Flow**:
1. Admin selects product and movement type.
2. For `inbound`, admin must enter `unitCost`.
3. System persists movement and updates stock.
4. System recalculates weighted-average cost basis.

---

## API / Code Examples

```ts
export interface CreateStockMovementDTO {
  productId: string;
  movementType: "inbound" | "outbound" | "adjustment";
  quantity: number;
  unitCost?: number; // mandatory for inbound
  reason?: string;
}
```

```ts
// Weighted-average cost update on inbound
export function recalcWeightedAverage(
  currentQty: number,
  currentAvgCost: number,
  inboundQty: number,
  inboundUnitCost: number,
): number {
  const totalQty = currentQty + inboundQty;
  return totalQty === 0
    ? 0
    : ((currentQty * currentAvgCost) + (inboundQty * inboundUnitCost)) / totalQty;
}
```

---

## Acceptance Criteria

- [x] Inbound movement cannot be confirmed without `unitCost`.
- [x] Stock movement history is auditable by product/date/type.
- [x] Weighted-average basis is updated consistently after inbound events.
- [x] Reporting uses persisted weighted-average basis for profit summary.

## Current Output

- Inventory module vertical slice implemented:
  - Domain aggregate: `InventoryItem`
  - Domain entity: `StockMovement`
  - Domain errors for stock and inbound cost rules
  - Repository port + in-memory adapter
  - Use cases:
    - `RegisterStockMovementUseCase`
    - `ListStockMovementsUseCase`
- Shared inventory mock runtime:
  - `src/modules/inventory/infrastructure/runtime/inventoryMockRuntime.ts`
- API endpoints:
  - `POST /api/v1/stock-movements`
  - `GET /api/v1/stock-movements` with filters `productId`, `movementType`, `dateFrom`, `dateTo`
- Inventory UI surface integrated:
  - `src/modules/inventory/presentation/components/StockMovementPanel.tsx`
  - mounted from `src/modules/sales/presentation/components/PosLayout.tsx` (`Inventory`)
  - stable UI test selectors (`data-testid`) added for product/type/quantity/cost/reason/history
- Reporting integration using persisted cost basis:
  - `GET /api/v1/reports/profit-summary` computes cost from recorded outbound stock movements.
- Stock movement response now includes:
  - `stockOnHandAfter`
  - `weightedAverageUnitCostAfter`
  - `inventoryValueAfter`
- Contracts:
  - OpenAPI updated in `src/app/api/v1/openapi.yaml`
  - DTOs:
    - `stock-movement-response.dto.ts`
    - `list-stock-movements-response.dto.ts`
- Test evidence:
  - `tests/e2e/inventory-stock-movements-api.spec.ts`
  - `tests/e2e/inventory-ui-stock-movement.spec.ts`
  - `tests/e2e/reporting-sales-history-and-profit-api.spec.ts`
