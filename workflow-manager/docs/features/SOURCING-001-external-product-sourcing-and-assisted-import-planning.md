# [SOURCING-001] Feature: External Product Sourcing and Assisted Import

## Metadata

**Feature ID**: `SOURCING-001`  
**Status**: `in_progress`  
**GitHub Issue**: #32  
**Priority**: `high`  
**Linked FR/NFR**: `FR-003`, `FR-008`, `FR-009`, `NFR-002`, `NFR-004`, `NFR-005`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`  
**Related PoC**: `workflow-manager/docs/pocs/001-poc-product-sourcing-vtex-search-feasibility-ready.md`  
**Related Existing Features**: `CATALOG-001`, `PRODUCTS-002`, `PRODUCTS-003`

---

## Business Goal

Reduce the time and friction required to onboard a new product by letting the operator search the Carrefour Argentina catalog, visually identify the correct item from real images, and import one or many selected products into the internal catalog without manual image hunting.

This feature exists because the current manual onboarding flow is already usable, but it still breaks down on the most expensive part of the workflow:

- finding a good product image,
- distinguishing close variants quickly,
- and classifying the product consistently enough for the POS and products workspace.

For the target operator profile, the product image is not a cosmetic field. It is a primary identification aid in both `/products` and checkout.

---

## Recommended Module Name

**Recommended slice name**: `product-sourcing`

Why this is the right name:

- it describes the business capability, not the current implementation detail (`scraping`),
- it remains valid if the source later becomes a documented API instead of HTML scraping,
- and it can be extracted into a standalone service later without renaming the bounded context.

The word `sourcing` also keeps the concern separate from the existing `catalog` module:

- `catalog` owns internal product rules,
- `product-sourcing` owns discovery, normalization, source traceability, and assisted import from external catalogs.

---

## Current Baseline

The system already has:

- manual guided onboarding in `CATALOG-001`,
- a converged `/products` workspace from `PRODUCTS-003`,
- a real create product command in `src/modules/catalog/application/use-cases/CreateProductUseCase.ts`,
- and a flexible `categoryId: string` model that can absorb mapped categories incrementally.

The first explicit product decision for this feature is now locked:

- **data source v1**: `Carrefour Argentina`
- **why**: the images are more normalized, visually consistent, and easier to identify quickly
- **fixed source URL**: `https://www.carrefour.com.ar/`

The current gap is not internal product persistence. The gap is **external discovery, assisted import orchestration, and image ownership**.

What is still missing after the current vertical slice:

- no provider health/rate-limit hardening yet,
- no import-history or retry-management UI yet,
- and no mobile/tablet-specific validation pass for larger assisted-import batches yet.

---

## Architecture Decision

### Pattern Analysis

This feature should use the following patterns from the project standards:

- **Adapter Pattern** for each external supermarket provider.
- **Strategy Pattern** for provider selection and future fan-out search.
- **Anti-Corruption Layer** between external retailer data and the internal catalog model.
- **Dependency Injection** so `product-sourcing` depends on ports, not on Supabase, Next.js, or specific retailers.
- **Result Pattern** for provider/network failures and partial import failures.

### Why a New Vertical Slice Instead of Extending `catalog`

Adding scraping logic directly into `catalog` would mix two different responsibilities:

- internal product invariants,
- and unstable external provider behavior.

That would make later microservice extraction harder and would leak retailer-specific concerns into the internal product model.

### Core Design Rule

`product-sourcing` must never create products by reaching into persistence directly.

Instead it should depend on a port such as:

```ts
export interface CatalogProductWriter {
  createFromExternalCandidate(input: {
    name: string;
    categoryId: string;
    price: number;
    initialStock: number;
    cost?: number;
    minStock?: number;
    imageUrl: string;
  }): Promise<{ id: string; sku: string; imageUrl: string }>;
}
```

That port can be implemented today by adapting `CreateProductUseCase`, and later by calling another service if the slice is extracted.

### Stage-1 Scope Decision

The first UI version should use **one fixed source only: Carrefour Argentina**.

Reason:

- it has the best image consistency among the explored providers,
- product photos look more normalized and easier to scan,
- the operator flow becomes simpler because there is no provider selector,
- and the first delivery can focus on one stable import experience instead of multi-provider ranking.

The backend should still keep the provider boundary behind ports so another source can be added later without rewriting the slice.

### Batch Selection Decision

When search results are displayed, the operator should be able to select **one or many** candidates and confirm a single batch import action.

Reason:

- onboarding often happens in small groups rather than strictly one product at a time,
- the operator already did the expensive recognition work while scanning the result list,
- and repeating the same confirm flow for every item would add unnecessary friction.

The batch import should return **per-item results** instead of all-or-nothing behavior, because selected products are independent and one invalid item should not block the rest.

---

## PoC Baseline and Technical Feasibility

The initial PoC completed on `2026-03-01` shows a strong `GO` signal:

- public supermarket search endpoints are accessible without Playwright,
- the payload already includes descriptive product titles,
- the payload includes image URLs, category breadcrumb paths, EAN, and reference price,
- `_from` / `_to` windowing works for smaller result pages,
- and the selected image URLs are directly downloadable with public caching headers.

See:

- `workflow-manager/docs/pocs/001-poc-product-sourcing-vtex-search-feasibility-ready.md`
- `workflow-manager/docs/pocs/scripts/product-sourcing-vtex-probe.mjs`

This materially changes the implementation direction:

- **preferred path**: HTTP provider adapters,
- **fallback path**: Playwright only if a provider later blocks or removes public catalog search access.

---

## Proposed Slice Structure

```text
src/modules/product-sourcing/
├── domain/
│   ├── entities/
│   │   ├── ExternalCatalogCandidate.ts
│   │   ├── ImportedProductSource.ts
│   │   └── CategoryMappingRule.ts
│   ├── value-objects/
│   │   ├── ProviderId.ts
│   │   ├── SearchQuery.ts
│   │   └── ExternalCategoryPath.ts
│   ├── errors/
│   │   └── ProductSourcingDomainError.ts
│   └── services/
│       └── ResolveExternalCategoryMapping.ts
├── application/
│   ├── ports/
│   │   ├── RetailerCatalogProvider.ts
│   │   ├── ProductImageAssetStore.ts
│   │   ├── CatalogProductWriter.ts
│   │   └── ImportedProductSourceRepository.ts
│   └── use-cases/
│       ├── SearchExternalProductsUseCase.ts
│       └── ImportExternalProductsUseCase.ts
├── infrastructure/
│   ├── providers/
│   │   ├── vtex/VtexCatalogProvider.ts
│   │   ├── carrefour/CarrefourCatalogProvider.ts
│   ├── repositories/
│   │   └── SupabaseImportedProductSourceRepository.ts
│   ├── storage/
│   │   └── SupabaseProductImageAssetStore.ts
│   └── runtime/
│       └── productSourcingRuntime.ts
└── presentation/
    ├── components/
    │   └── ProductSourcingScreen.tsx
    ├── hooks/
    │   └── useProductSourcing.ts
    └── dtos/
        ├── product-sourcing-search.dto.ts
        └── import-external-product.dto.ts
```

### Reuse Opportunity

Even though v1 is now intentionally locked to Carrefour, the PoC showed that other supermarkets exposed a similar VTEX-style response family. That still justifies a shared `VtexCatalogProvider` base adapter under the Carrefour-specific adapter so the slice stays extensible.

---

## Proposed API Contracts

### Search Endpoint

```http
GET /api/v1/product-sourcing/search?q=coca%20cola%20zero%202,25&page=1&pageSize=12
```

**Response sketch**:

```json
{
  "items": [
    {
      "providerId": "carrefour",
      "sourceProductId": "393964",
      "name": "Gaseosa cola Coca Cola Zero 2,25 lts",
      "brand": "Coca Cola",
      "ean": "7790895067570",
      "categoryTrail": ["/Bebidas/Gaseosas/Gaseosas cola/"],
      "suggestedCategoryId": "gaseosas-cola",
      "imageUrl": "https://carrefourar.vteximg.com.br/arquivos/ids/395283/7790895067570_E01.jpg",
      "referencePrice": 5250,
      "productUrl": "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-zero-225-lts-393964/p"
    }
  ],
  "page": 1,
  "pageSize": 12,
  "hasMore": true
}
```

### Import Endpoint

```http
POST /api/v1/product-sourcing/import
Idempotency-Key: 7aa5c7a2-1f98-4a3c-98a0-74ea77a80a3f
```

```json
{
  "items": [
    {
      "providerId": "carrefour",
      "sourceProductId": "393964",
      "sourceImageUrl": "https://carrefourar.vteximg.com.br/arquivos/ids/395283/7790895067570_E01.jpg",
      "productUrl": "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-zero-225-lts-393964/p",
      "name": "Gaseosa cola Coca Cola Zero 2,25 lts",
      "brand": "Coca Cola",
      "ean": "7790895067570",
      "categoryTrail": ["/Bebidas/Gaseosas/Gaseosas cola/"],
      "categoryId": "gaseosas-cola",
      "price": 0,
      "initialStock": 0,
      "minStock": 0,
      "cost": null
    },
    {
      "providerId": "carrefour",
      "sourceProductId": "636689",
      "sourceImageUrl": "https://carrefourar.vteximg.com.br/arquivos/ids/395286/7790895012259_E01.jpg",
      "productUrl": "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-zero-175-lts-636689/p",
      "name": "Gaseosa cola Coca Cola Zero 1,75 lts",
      "brand": "Coca Cola",
      "ean": "7790895012259",
      "categoryTrail": ["/Bebidas/Gaseosas/Gaseosas cola/"],
      "categoryId": "gaseosas-cola",
      "price": 0,
      "initialStock": 0,
      "minStock": 0,
      "cost": null
    }
  ]
}
```

Design notes:

- `search` is read-only and paginated.
- `import` is a critical write and must support idempotency keys.
- v1 does not expose a provider selector in the UI because the source is fixed to Carrefour Argentina.
- `import` accepts `1..n` selected items and returns per-item results so the operator can see which products were created and which failed.
- `referencePrice` is informational in v1 and should not auto-fill sale price without explicit confirmation.

---

## Category Mapping Strategy

The current catalog model uses a free-form `categoryId`, so the first version can stay simple without blocking on a first-class category aggregate.

### Proposed Rule

1. Try exact mapping by `providerId + external category path`.
2. If no mapping exists, derive a leaf slug suggestion from the retailer path.
3. Let the operator confirm or override the final `categoryId` before import.
4. Persist the decision for the next import.

### Recommended Persistence

Introduce an infrastructure table such as `external_category_mappings`:

- `provider_id`
- `external_category_path`
- `internal_category_id`
- `confidence`
- `created_at`
- `updated_at`

This avoids hardcoding retailer taxonomy logic inside UI components.

Current implementation status:

- persisted in `public.external_category_mappings`,
- keyed by `provider_id + external_category_path`,
- written during successful import confirmation,
- and reused on later searches so the next candidate defaults to the already-confirmed internal category.

---

## Image Storage Strategy

### Stage-1 Rule

Only download and persist the **selected primary image for each selected item** after the operator confirms the import.

Do not mirror the whole provider catalog.

### Why

- storage growth stays proportional to actual inventory,
- import remains fast enough,
- and the app stops depending on hotlinked retailer URLs after the import is accepted.

### Recommended Port

```ts
export interface ProductImageAssetStore {
  persistExternalImage(input: {
    providerId: string;
    sourceProductId: string;
    sourceImageUrl: string;
    desiredObjectKey: string;
  }): Promise<{
    storagePath: string;
    publicUrl: string;
    contentType: string;
    sizeBytes: number;
  }>;
}
```

### Implementation Rules

- validate allowed hostnames per provider,
- enforce max size and MIME type (`image/jpeg`, `image/png`, `image/webp`),
- use deterministic object keys,
- store source metadata for future reprocessing or storage migration,
- and fail the affected selection if image persistence fails.

If the image import fails for one selected item, the UX should mark that item as failed, continue with the rest of the batch, and optionally offer manual fallback to the existing placeholder-based onboarding flow for that specific product.

---

## UX and Performance Rules

### Primary UI Surface

The selection flow must run in a **dedicated screen**, not in a modal or small inline panel.

Recommended route shape for v1:

- `/products/sourcing`

Why:

- the operator needs enough space to scan images comfortably,
- batch selection is easier to understand in a full-screen layout,
- and the flow becomes easier to evolve later into filters, batch confirmation, and import history.

### Search UX

- do not search before `3` meaningful characters,
- do not fire a request on every keystroke,
- debounce input by `500ms` and trigger search only after typing stops,
- support explicit `Enter` submit for operators who type decisively,
- cancel in-flight searches with `AbortController`,
- never auto-import or auto-select the first provider result,
- show a Carrefour origin badge and large image preview in result cards,
- allow selecting `1..n` visible results before confirming import,
- keep a persistent selected-count summary and batch import action,
- keep result pages small (`8-12` items) to reduce cognitive load.

### Image Loading UX

- the result image is a first-class identification signal and not a decorative asset,
- the screen must prioritize fast visible thumbnail rendering above additional metadata,
- above-the-fold result images should load eagerly,
- below-the-fold result images should load lazily,
- result cards should use a fixed thumbnail box to avoid layout shift,
- and only the primary image should be loaded in the search list.

### Image Performance Strategy

- request small result pages so the browser is not flooded with images,
- prefer thumbnail-sized provider images when the source supports it,
- keep the list view on lightweight thumbnails and load larger previews only on selection or detail review,
- avoid rendering secondary gallery images in the search list,
- and treat slow image loading as a usability defect because it directly hurts product recognition.

### React/Next Behavior

- mount the sourcing flow as a dedicated screen component, not as a transient dialog,
- trigger network search from a dedicated hook in `presentation/hooks`,
- use deferred query state for typing responsiveness,
- keep the debounced search value separate from the raw input value,
- keep the route/controller thin and move normalization into the use case or provider adapter,
- and keep imported product creation inside existing product command boundaries.

### Future Multi-Provider Search

Multi-provider search is a valid later extension, but it should be added only after:

- Carrefour-only UX is validated,
- ranking and deduplication criteria are defined,
- and provider rate limits are understood.

---

## Scope

### In Scope for V1

- Carrefour-backed external product search through an internal versioned endpoint,
- dedicated `/products/sourcing` screen,
- fixed-source UI flow without provider selector,
- multi-select result list with batch import confirmation,
- normalized search result cards with image, title, brand, category trail, and optional reference price,
- category suggestion and confirmation before import,
- selected image ingestion into managed storage,
- source traceability record linking internal product to external source,
- reuse of the existing internal product creation flow through a port.

### Out of Scope for V1

- Playwright-driven HTML automation as the primary path,
- continuous price sync from retailers,
- automatic repricing based on retailer data,
- multi-provider deduplication and ranking,
- provider selector in the UI,
- turning categories into a full aggregate if the current string model remains sufficient.

---

## Acceptance Criteria

- [ ] The operator can search Carrefour Argentina from `/products` without leaving the app.
- [ ] The sourcing flow runs in a dedicated screen with enough space to inspect result images comfortably.
- [ ] Search results show a large enough image and descriptive title to distinguish nearby variants quickly.
- [ ] Search requests are not fired on every keystroke and only run after typing stops or the operator presses `Enter`.
- [ ] The first visible result images load fast enough to support quick product recognition.
- [ ] The operator can select one or many search results and confirm a batch import in one action.
- [ ] Each selected item allows category confirmation and minimum product field review before import.
- [ ] The system stores the selected external image for each successful item in managed storage and creates the product through the internal catalog command path.
- [ ] The imported products are visible in `/products` and usable from the sales workspace after refresh.
- [ ] Source metadata (provider, source product id, source URL, image URL, category path, EAN if present) is persisted for traceability.
- [ ] A category confirmed for one imported external path is reused automatically in later search results that share the same external category path.
- [ ] The operator can review, correct, or delete learned category mappings from the sourcing workspace.
- [ ] Batch import feedback shows per-item success and failure states without hiding partial results.
- [ ] The architecture keeps retailer-specific logic outside `catalog` and `products`.

---

## Delivery Plan

### Phase 0 - Provider Feasibility and Contract Lock

- Convert the current PoC into a committed feature decision.
- Define OpenAPI contracts for `search` and `import`.
- Lock the first source for implementation:
  - `carrefour`

### Phase 1 - Search Slice

- Create `product-sourcing` ports and use cases.
- Implement `CarrefourCatalogProvider` on top of shared VTEX normalization.
- Expose `GET /api/v1/product-sourcing/search`.
- Add contract and adapter integration tests.

### Phase 1 - Current Output

- `src/modules/product-sourcing/domain/value-objects/SearchQuery.ts`
- `src/modules/product-sourcing/domain/entities/ExternalCatalogCandidate.ts`
- `src/modules/product-sourcing/application/ports/RetailerCatalogProvider.ts`
- `src/modules/product-sourcing/application/use-cases/SearchExternalProductsUseCase.ts`
- `src/modules/product-sourcing/infrastructure/providers/vtex/VtexCatalogProvider.ts`
- `src/modules/product-sourcing/infrastructure/providers/carrefour/CarrefourCatalogProvider.ts`
- `src/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime.ts`
- `src/modules/product-sourcing/presentation/dtos/product-sourcing-search.dto.ts`
- `src/modules/product-sourcing/presentation/handlers/searchExternalProductsHandler.ts`
- `src/app/api/v1/product-sourcing/search/route.ts`
- `src/app/api/v1/openapi.yaml` updated with `/product-sourcing/search`
- Deterministic fixtures and tests:
  - `tests/fixtures/product-sourcing/carrefour-search-response.json`
  - `tests/fixtures/product-sourcing/carrefour-search-response-local-fixture.json`
  - `tests/e2e/product-sourcing-search-use-case.spec.ts`
  - `tests/e2e/product-sourcing-carrefour-provider.spec.ts`
  - `tests/e2e/product-sourcing-search-handler.spec.ts`
- UI search surface:
  - `src/modules/product-sourcing/presentation/components/ProductSourcingScreen.tsx`
  - `src/app/products/sourcing/page.tsx`
  - `tests/e2e/product-sourcing-ui.spec.ts`

### Phase 2 - Assisted Import Slice

- Implement image asset storage adapter.
- Implement source trace persistence.
- Expose `POST /api/v1/product-sourcing/import` with batch payload support.
- Adapt to `CreateProductUseCase` through `CatalogProductWriter`.

### Phase 2 - Current Output

- `src/modules/product-sourcing/application/ports/CatalogProductWriter.ts`
- `src/modules/product-sourcing/application/ports/ProductImageAssetStore.ts`
- `src/modules/product-sourcing/application/ports/ImportedProductSourceRepository.ts`
- `src/modules/product-sourcing/application/ports/ExternalCategoryMappingRepository.ts`
- `src/modules/product-sourcing/application/use-cases/ImportExternalProductsUseCase.ts`
- `src/modules/product-sourcing/infrastructure/adapters/CatalogCreateProductWriter.ts`
- `src/modules/product-sourcing/infrastructure/storage/SupabaseProductImageAssetStore.ts`
- `src/modules/product-sourcing/infrastructure/repositories/SupabaseExternalCategoryMappingRepository.ts`
- `src/modules/product-sourcing/infrastructure/repositories/SupabaseImportedProductSourceRepository.ts`
- `src/modules/product-sourcing/domain/entities/CategoryMappingRule.ts`
- `src/modules/product-sourcing/domain/entities/ImportedProductSource.ts`
- `src/modules/product-sourcing/domain/services/ResolveExternalCategoryPath.ts`
- `src/modules/product-sourcing/domain/services/ResolveImportedProductImageObjectKey.ts`
- `src/modules/product-sourcing/domain/services/ResolveImportedProductSku.ts`
- `src/modules/product-sourcing/presentation/dtos/import-external-products.dto.ts`
- `src/modules/product-sourcing/presentation/handlers/importExternalProductsHandler.ts`
- `src/app/api/v1/product-sourcing/import/route.ts`
- `src/app/api/v1/openapi.yaml` updated with `/product-sourcing/import`
- `supabase/migrations/20260301130000_product_sourcing_trace.sql`
- `supabase/migrations/20260301140000_external_category_mappings.sql`
- Current duplicate-protection rule:
  - deterministic SKU generation (`CRF-<sourceProductId>`) remains as a secondary guardrail,
  - primary duplicate detection now comes from persisted `imported_product_sources` uniqueness (`provider_id + source_product_id`).
- Image/trace behavior now implemented:
  - selected images are persisted into the public Supabase bucket `product-sourcing-images`,
  - the imported catalog product receives the managed storage URL instead of the external retailer hotlink,
  - and each successful import writes a trace record with provider, source ids, stored asset metadata, and linked internal product id.
- Category mapping behavior now implemented:
  - each successful import persists `provider_id + external_category_path -> internal_category_id`,
  - later searches override the raw retailer suggestion with the confirmed internal category,
  - and the `/products/sourcing` import form now reuses that mapping on subsequent results sharing the same external path.
- Deterministic coverage:
  - `tests/e2e/product-sourcing-import-use-case.spec.ts`
  - `tests/e2e/product-sourcing-import-ui.spec.ts`
  - `tests/e2e/product-sourcing-category-mapping-ui.spec.ts`

### Phase 3 - `/products` UI Integration

- Add a dedicated sourcing screen reachable from `/products`.
- Keep the current manual onboarding path available as fallback.
- Add multi-select result cards and batch confirmation summary.
- Implement debounced search and image-loading rules for above-the-fold thumbnails.
- Validate the operator flow on tablet and mobile widths.

### Phase 3 - Current Output

- `/products` now links to `/products/sourcing` through the converged workspace CTA in `src/modules/products/presentation/components/ProductsInventoryPanel.tsx`.
- `/products/sourcing` now supports:
  - debounced Carrefour search,
  - multi-select result cards,
  - inline import data completion (`name`, `categoryId`, `price`, `initialStock`, `cost`, `minStock`),
  - assisted batch import execution against the real catalog runtime,
  - persisted category mapping reuse across later searches,
  - operator-facing learned mapping management (`list`, `update`, `delete`) from the same screen,
  - managed image persistence plus source trace recording during each successful import,
  - and navigation back to `/products` to verify imported products in the live workspace.
- Real-backend UI proof:
  - `tests/e2e/product-sourcing-import-ui.spec.ts` verifies `/products -> /products/sourcing -> import -> /products -> /sales` and asserts the imported product card now renders from the managed storage URL.
  - `tests/e2e/product-sourcing-category-mapping-ui.spec.ts` verifies that a category confirmed in one import is reused automatically in a later search result sharing the same external path.
  - `tests/e2e/product-sourcing-category-mapping-management-ui.spec.ts` verifies that a learned mapping can be edited and deleted from `/products/sourcing`, and that later searches immediately reflect that change.

### Phase 4 - Hardening

- Add rate limiting and provider health logging.
- Add E2E with mocked provider responses.
- Add an opt-in smoke probe for live provider access outside deterministic CI.

---

## Testing Strategy

### Unit

- search query normalization,
- category mapping policy,
- provider result normalization,
- batch import failure rules and idempotency behavior.

### Integration

- Carrefour adapter against captured VTEX-like fixtures,
- image asset persistence to Supabase storage,
- source import repository persistence,
- runtime wiring between `product-sourcing` and `catalog`.

### E2E

- mocked Carrefour-backed search and batch import flow from `/products`,
- real-backend UI validation for persisted category mapping reuse,
- real-backend UI validation for learned mapping management (`list/update/delete`),
- screen-level validation for debounced search behavior and rapid thumbnail recognition,
- real product visibility after batch import in `/products` and `/sales`,
- optional live provider smoke checks behind an explicit env flag, not in the stable CI gate.

---

## Risks and Open Questions

- **Undocumented provider APIs**: the discovered endpoints are public but not formally documented. Mitigation: isolate them behind adapters and add provider health monitoring.
- **Single-source dependency**: v1 depends entirely on Carrefour availability and payload stability. Mitigation: keep the provider boundary explicit and retain the PoC evidence for future fallback sources.
- **Terms of use / rate limits**: legal and operational validation is still required before production-heavy usage.
- **Branch-sensitive pricing**: retailer prices can depend on region, cookies, or seller configuration. Mitigation: treat provider price as guidance only in v1.
- **Category drift**: retailer taxonomy can change over time. Mitigation: persist mappings and keep operator confirmation in the import step.
- **Storage growth**: image storage will grow with inventory. Mitigation: only persist selected images and keep the asset store behind a replaceable port.

---

## Architecture Artifacts

- Class diagram: `workflow-manager/docs/planning/diagrams/class-product-sourcing-module.md`
- Sequence diagram: `workflow-manager/docs/planning/diagrams/sequence-product-sourcing-import.md`
- Activity diagram: `workflow-manager/docs/planning/diagrams/activity-product-sourcing-search-and-import.md`
- State diagram: `workflow-manager/docs/planning/diagrams/state-product-sourcing-import-session.md`

---

## Recommendation

Proceed with `SOURCING-001` as a post-MVP extension feature.

The current evidence supports a **GO** decision with these guardrails:

- API-first provider adapters before Playwright,
- Carrefour-only UX first,
- batch selection and per-item import feedback,
- explicit category confirmation,
- managed image persistence only after selection,
- and source-trace persistence from the first imported product.
