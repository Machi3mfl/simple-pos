# [CATALOG-001] Feature: Guided Product Onboarding and Placeholders

## Metadata

**Feature ID**: `CATALOG-001`  
**Status**: `in_progress`  
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
- [x] Missing image never blocks product creation.
- [x] Placeholder assignment is deterministic and test-covered.
- [ ] Created product is visible and usable in POS.
- [x] Bulk price update supports percentage/fixed amount by scope with preview and validation.
- [x] Bulk price update writes audit summary (products affected, old/new prices, author, timestamp).

## Current Output

- Product onboarding API implemented:
  - `GET /api/v1/products`
  - `POST /api/v1/products`
  - `POST /api/v1/products/price-batches`
  - file: `src/app/api/v1/products/route.ts`
- Bulk repricing API route:
  - `src/app/api/v1/products/price-batches/route.ts`
- Repricing application use case:
  - `src/modules/catalog/application/use-cases/ApplyBulkPriceUpdateUseCase.ts`
- Shared mock runtime for catalog endpoints:
  - `src/modules/catalog/infrastructure/runtime/catalogMockRuntime.ts`
- Catalog module vertical slice created:
  - Domain entity + errors
  - Placeholder domain service
  - Application use cases (`CreateProduct`, `ListProducts`, `ApplyBulkPriceUpdate`)
  - In-memory repository adapter
- DTO schemas upgraded to Zod contracts:
  - `src/modules/catalog/presentation/dtos/create-product.dto.ts`
  - `src/modules/catalog/presentation/dtos/bulk-price-update.dto.ts`
  - `src/modules/catalog/presentation/dtos/product-response.dto.ts`
- Placeholder strategy:
  - deterministic SVG data URI by category when `imageUrl` is missing
  - explicit `imageUrl` remains unchanged
- Test evidence:
  - `tests/e2e/catalog-onboarding-api.spec.ts`
  - `tests/e2e/catalog-bulk-price-update-api.spec.ts`
