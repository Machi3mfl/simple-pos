# [CATALOG-001] Feature: Guided Product Onboarding and Placeholders

## Metadata

**Feature ID**: `CATALOG-001`  
**Status**: `done`  
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

- [x] Wizard allows product creation in guided mode without technical friction.
- [x] Missing image never blocks product creation.
- [x] Placeholder assignment is deterministic and test-covered.
- [x] Created product is visible and usable in POS.
- [x] Category entry accepts a human-readable label, persists a canonical code, and prevents duplicate category variants caused by punctuation/casing differences.
- [x] Manual onboarding and product edit flows accept either direct file upload or an operator-provided image URL, and both end in managed Supabase Storage.
- [x] Bulk price update supports percentage/fixed amount by scope with preview and validation.
- [x] Bulk price update writes audit summary (products affected, old/new prices, author, timestamp).

## Current Output

- Product onboarding API implemented:
  - `GET /api/v1/products`
  - `POST /api/v1/products`
  - `POST /api/v1/products/price-batches`
  - file: `src/app/api/v1/products/route.ts`
- Catalog UI surfaces integrated in POS side rail:
  - `src/modules/catalog/presentation/components/ProductOnboardingPanel.tsx`
  - `src/modules/catalog/presentation/components/BulkPriceUpdatePanel.tsx`
  - mounted from `src/modules/sales/presentation/components/PosLayout.tsx` (`Catalog`)
  - cross-panel refresh token in `PosLayout` keeps onboarding and bulk list synchronized
  - empty-scope guard in bulk UI blocks invalid requests and shows guided warning state
- Category entry and display behavior:
  - product onboarding and edit flows now use a shared `CategoryInputField`
  - operator-facing labels stay human-readable (example: `Desayuno y merienda`)
  - persisted category ids are canonical slug codes (example: `desayuno-y-merienda`)
  - normalization removes duplicate variants caused by alternate separators, casing, or symbols
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
- Shared category naming utilities:
  - `src/shared/core/category/categoryNaming.ts`
  - `src/modules/catalog/presentation/components/CategoryInputField.tsx`
- Managed image policy:
  - deterministic SVG data URI by category when `imageUrl` is missing
  - manual create/edit now use `ManagedProductImageField`
  - operator-provided image URLs are downloaded server-side and stored in Supabase bucket `product-images`
  - uploaded image files are stored in the same managed bucket
  - sourced imports already followed the same managed-storage policy through `product-sourcing-images`
- Test evidence:
  - `tests/e2e/catalog-onboarding-api.spec.ts`
  - `tests/e2e/catalog-bulk-price-update-api.spec.ts`
  - `tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts`
  - `tests/e2e/products-workspace-ui.spec.ts`

## Pending Follow-up

- Optional extension: apply the same managed-image ingestion policy to `/api/v1/products/import` batch CSV rows that currently still accept raw `imageUrl` values.
