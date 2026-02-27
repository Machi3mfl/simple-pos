# [CATALOG-001] Feature: Guided Product Onboarding and Placeholders

## Metadata

**Feature ID**: `CATALOG-001`  
**Status**: `draft`  
**GitHub Issue**: #8  
**Priority**: `high`  
**Linked PBIs**: `PBI-006`, `PBI-007`, `PBI-019`  
**Linked FR/NFR**: `FR-003`, `FR-008`, `FR-009`, `FR-015`, `NFR-002`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`

---

## Business Goal

Enable non-technical users to create sale-ready products quickly, without blocking on real product photos, and allow fast batch repricing when market prices change.

## Use Case Summary

**Primary Actor**: support admin  
**Trigger**: new product must be added  
**Main Flow**:
1. Admin opens onboarding wizard.
2. Admin enters minimal fields (name, category, price, stock, optional cost).
3. If no image is provided, system applies category placeholder.
4. Product is activated for POS usage.
5. Admin can run bulk price update by scope with preview before apply.

---

## API / Code Examples

```ts
export interface CreateProductDTO {
  name: string;
  categoryId: string;
  price: number;
  cost?: number;
  initialStock: number;
  imageUrl?: string;
}
```

```ts
function resolveProductImage(input?: string, categoryPlaceholder?: string): string {
  return input && input.length > 0 ? input : categoryPlaceholder ?? "/images/placeholders/default.png";
}
```

```ts
export interface BulkPriceUpdateDTO {
  scope: { type: "all" | "category" | "selection"; categoryId?: string; productIds?: string[] };
  mode: "percentage" | "fixed_amount";
  value: number;
}
```

---

## Acceptance Criteria

- [ ] Wizard allows product creation in guided mode without technical friction.
- [ ] Missing image never blocks product creation.
- [ ] Placeholder assignment is deterministic and test-covered.
- [ ] Created product is visible and usable in POS.
- [ ] Bulk price update supports percentage/fixed amount by scope with preview and validation.
- [ ] Bulk price update writes audit summary (products affected, old/new prices, author, timestamp).
