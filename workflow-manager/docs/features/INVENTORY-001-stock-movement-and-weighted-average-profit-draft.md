# [INVENTORY-001] Feature: Stock Movement and Weighted-Average Profit Basis

## Metadata

**Feature ID**: `INVENTORY-001`  
**Status**: `draft`  
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

- [ ] Inbound movement cannot be confirmed without `unitCost`.
- [ ] Stock movement history is auditable by product/date/type.
- [ ] Weighted-average basis is updated consistently after inbound events.
- [ ] Reporting uses persisted weighted-average basis for profit summary.
