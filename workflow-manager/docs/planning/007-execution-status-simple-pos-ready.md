# Execution Status: simple-pos

## Document Metadata

**Document ID**: `007`  
**File Name**: `007-execution-status-simple-pos-ready.md`  
**Status**: `done`
**GitHub Issue**: #18  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.3`
**Created At**: `2026-03-01`  
**Last Updated**: `2026-03-01`  
**Source Docs**: `001`, `002`, `003`, `004`, `005`, `006`  

---

> Closure note: this snapshot records the completed MVP execution state as of `2026-03-01`, plus the post-MVP planning item opened on the same date for external product sourcing.

## 1. Iteration Status

| Iteration | Scope | Status | Evidence |
| --- | --- | --- | --- |
| Iteration 0 | Architecture artifacts + OpenAPI baseline | done | TASK-001, TASK-002, TASK-003 |
| Iteration 1 | Tablet POS UI + checkout rules + mock E2E | done | TASK-004, TASK-005, TASK-006 |
| Iteration 2 | Contracts + mock runtime | done | API-001 + contract and mock E2E suites |
| Iteration 3 | Catalog + inventory + bulk repricing | done | CATALOG-001, INVENTORY-001 |
| Iteration 4 | On-account debt and payments | done | AR-001 + UI/API/E2E debt flows |
| Iteration 5 | Offline capture and sync | done | OFFLINE-001 + offline recovery E2E |
| Iteration 6 | Reporting + release gate real backend | done | RELEASE-001 + real-backend suites |

---

## 2. Feature Status

| Feature | Status |
| --- | --- |
| POS-001 | done |
| API-001 | done |
| CATALOG-001 | done |
| INVENTORY-001 | done |
| PRODUCTS-001 | done |
| PRODUCTS-002 | done |
| PRODUCTS-003 | done |
| SOURCING-001 | in_progress |
| AR-001 | done |
| OFFLINE-001 | done |
| RELEASE-001 | done |
| I18N-001 | done |

---

## 3. Task Status

| Task | Status | Notes |
| --- | --- | --- |
| TASK-001 | done | Diagram delivered and linked |
| TASK-002 | done | Flow diagrams validated and linked |
| TASK-003 | done | OpenAPI + DTO baseline + contract checks |
| TASK-004 | done | Added section tests + responsive tablet snapshots |
| TASK-005 | done | Added unit + integration checks for payment constraints |
| TASK-006 | done | Mock smoke and visual baseline stable |
| TASK-007 | done | Guided onboarding now runs inside `/products` using shared create logic |
| TASK-008 | done | Preview/apply repricing now runs inside `/products` with audit summary preserved |
| TASK-009 | done | Paste-and-apply bulk import accepted intentionally and made explicit in the UI |
| TASK-010 | done | Legacy `/catalog` and `/inventory` were removed from the operational route model; converged suite updated |

---

## 4. Task Audit Result

- `workflow-manager/docs/tasks/` currently contains ten task documents: `TASK-001` through `TASK-010`.
- `TASK-001` through `TASK-010` are marked `done` and their referenced outputs still exist in the repository.
- `PRODUCTS-003` is now closed after route convergence moved the remaining admin flows fully into `/products`.
- Recent extension work remains traceable through `PRODUCTS-001`, `PRODUCTS-002`, `PRODUCTS-003`, and `I18N-001`.

---

## 5. Current Pending Items

Open planning item:

- `SOURCING-001` external product sourcing and assisted import:
  - status: `in_progress`
  - PoC status: `completed`
  - implementation status: `Phase 1 / Search Slice` completed + `Phase 2/3` UI-first assisted import slice running with persisted category mapping reuse
  - current output:
    - `GET /api/v1/product-sourcing/search`
    - `POST /api/v1/product-sourcing/import`
    - `GET/PATCH/DELETE /api/v1/product-sourcing/category-mappings`
    - `GET /api/v1/product-sourcing/import-history`
    - dedicated `/products/sourcing` screen reachable from `/products`
    - `/products/sourcing` now runs inside the shared workspace shell so the main navigation remains visible during sourcing
    - `product-sourcing` module runtime wired to real catalog creation through `CatalogProductWriter`
    - selected external images are persisted into the managed storage bucket `product-sourcing-images`
    - traceability rows are persisted in `imported_product_sources`
    - confirmed external category paths are persisted in `external_category_mappings`
    - later searches now reuse the confirmed internal category automatically when the external category path matches
    - category entry across onboarding and sourcing now normalizes operator-friendly labels into canonical codes to prevent duplicate categories caused by different writing styles
    - Carrefour provider calls are now wrapped with process-local throttling plus structured health logging
    - opt-in live provider smoke remains available through `npm run probe:product-sourcing:carrefour` guarded by `PRODUCT_SOURCING_LIVE_SMOKE=1`
    - learned category mappings can be reviewed, corrected, and deleted from the sourcing workspace itself
    - recent imports can be reviewed from the sourcing workspace with internal product name, SKU, category, and import timestamp
    - sourcing UI now has explicit tablet/mobile validation coverage for search, selection summary placement, and import CTA visibility
    - deterministic SKU dedupe (`CRF-<sourceProductId>`) remains as a secondary import guardrail
    - contract/use-case/provider/UI tests with deterministic fixtures, including fixture-backed real-backend sourcing runs
    - real-backend UI proof from sourcing to `/products` and `/sales`, plus managed image URL verification and persisted category mapping reuse
  - main artifact: `workflow-manager/docs/features/SOURCING-001-external-product-sourcing-and-assisted-import-planning.md`

---

## 6. Verification Snapshot

- Real-backend module suite: `npm run test:e2e:ui:real:modules` -> passing.
- Real-backend release gate: `npm run test:e2e:release-gate:real` -> passing.
- NFR evidence baseline: `workflow-manager/docs/planning/008-nfr-validation-evidence-ready.md`.
- UC to E2E mapping: `workflow-manager/docs/planning/006-uc-e2e-traceability-matrix-ready.md`.
- Unified `/products` workspace coverage: `tests/e2e/products-workspace-ui.spec.ts`, `tests/e2e/products-workspace-api.spec.ts`.
- Converged `/products` coverage: `tests/e2e/ui-vertical-slices-smoke.spec.ts`, `tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts`, `tests/e2e/inventory-ui-stock-movement.spec.ts`.
- Sourcing UI coverage: `tests/e2e/product-sourcing-ui.spec.ts`, `tests/e2e/product-sourcing-import-ui.spec.ts`, `tests/e2e/product-sourcing-import-use-case.spec.ts`.
- Sourcing trace verification: local Supabase validation confirmed one `imported_product_sources` row and a managed public URL under `product-sourcing-images` after the real-backend UI import flow.
- Sourcing category mapping verification: `tests/e2e/product-sourcing-category-mapping-ui.spec.ts` proves that a category confirmed in one import is auto-reused on a later result sharing the same external path.
- Sourcing category mapping management verification: `tests/e2e/product-sourcing-category-mapping-management-ui.spec.ts` proves that learned mappings can be updated and deleted from the UI and that the next search reflects the change.
- Sourcing import history verification: `tests/e2e/product-sourcing-import-ui.spec.ts` and `tests/e2e/product-sourcing-import-history-use-case.spec.ts` prove that recent imports remain queryable from persisted trace data with internal product name and SKU.
- Category canonicalization verification: `tests/e2e/catalog-onboarding-api.spec.ts`, `tests/e2e/products-workspace-ui.spec.ts`, and `tests/e2e/product-sourcing-category-mapping-ui.spec.ts` prove that operator-facing category labels remain readable while stored ids are normalized to canonical slug codes.
- Provider hardening verification: `tests/e2e/product-sourcing-provider-hardening.spec.ts` proves throttled provider calls plus structured success/failure health events for the Carrefour adapter wrapper.
- Responsive sourcing verification: `tests/e2e/product-sourcing-responsive-ui.spec.ts` proves the sourcing flow remains usable on tablet and mobile widths without losing the selected-items summary or the import action.
