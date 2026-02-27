# [CATALOG-001] Feature: Guided Product Onboarding and Placeholders

## Metadata

**Feature ID**: `CATALOG-001`  
**Status**: `draft`  
**Priority**: `high`  
**Linked PBIs**: `PBI-006`, `PBI-007`  
**Linked FR/NFR**: `FR-003`, `FR-008`, `FR-009`, `NFR-002`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`

---

## Business Goal

Enable non-technical users to create sale-ready products quickly, without blocking on real product photos.

## Use Case Summary

**Primary Actor**: support admin  
**Trigger**: new product must be added  
**Main Flow**:
1. Admin opens onboarding wizard.
2. Admin enters minimal fields (name, category, price, stock, optional cost).
3. If no image is provided, system applies category placeholder.
4. Product is activated for POS usage.

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

---

## Acceptance Criteria

- [ ] Wizard allows product creation in guided mode without technical friction.
- [ ] Missing image never blocks product creation.
- [ ] Placeholder assignment is deterministic and test-covered.
- [ ] Created product is visible and usable in POS.

