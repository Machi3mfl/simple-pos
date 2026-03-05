# [PRODUCTS-003] Feature: Products Workspace Parity and Catalog Convergence

## Metadata

**Feature ID**: `PRODUCTS-003`
**Status**: `done`
**GitHub Issue**: #23  
**Priority**: `high`
**Linked FR/NFR**: `FR-003`, `FR-008`, `FR-015`, `NFR-002`, `NFR-005`
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`
**Depends On**: `PRODUCTS-002`, `CATALOG-001`, `INVENTORY-001`

---

## Business Goal

Turn `/products` into the single operational workspace for product administration so the team can retire the remaining day-to-day dependency on `/catalog` and `/inventory`.

This follow-up exists because the MVP and `PRODUCTS-002` already delivered a real products workspace, but a few administrative flows still live in the legacy catalog area.

---

## Scope

### In Scope

- Move guided product onboarding into `/products`
- Move bulk price update preview and apply into `/products`
- Decide whether bulk imports should keep the current paste-and-apply flow or gain a preview and dry-run step
- Retire `/catalog` and `/inventory` as operational fallbacks once parity is complete
- Refresh regression coverage and workflow traceability for the converged workspace

### Out of Scope

- Rewriting the catalog and inventory domains into one module
- Changing the source of truth chosen in `PRODUCTS-002`
- Replacing product-level patch and stock-movement APIs with a brand-new bulk backend contract

---

## Acceptance Criteria

- [x] Guided onboarding is reachable from `/products` without sending the operator to `/catalog`
- [x] Bulk price update with preview and audit summary is reachable from `/products`
- [x] Bulk product profile edit is reachable from `/products` with scope selection and per-product editable fields
- [x] The batch import UX decision is explicitly documented and reflected in the workspace UI
- [x] `/catalog` and `/inventory` are no longer part of daily product administration
- [x] UI, API, persistence, and E2E docs remain aligned after the convergence

---

## Planned Task Breakdown

- `TASK-007` Bring guided onboarding into `/products` (done)
- `TASK-008` Bring bulk price update preview and apply into `/products` (done)
- `TASK-009` Decide the batch import preview and dry-run UX for `/products` (done)
- `TASK-010` Retire `/catalog` and `/inventory` fallbacks after parity closes (done)

## Decision Note (`TASK-009`)

Bulk imports in `/products` intentionally remain paste-and-apply flows without a separate preview wizard.

Why this is the chosen direction:

- it keeps the operator path short for a low-frequency administrative action,
- it avoids adding a multi-step wizard before there is field evidence that the current flow is unsafe,
- and it preserves the existing per-row invalid-item feedback as the present safety mechanism.

The workspace now makes that decision explicit in the bulk import dialogs by warning that valid rows persist immediately on confirmation.

---

## Definition of Done

- [x] `/products` covers the remaining admin flows that still depend on `/catalog`
- [x] Legacy fallback routes are removed from the operational app surface
- [x] Workflow docs and GitHub issues reflect the post-MVP convergence state
- [x] Real-backend E2E coverage protects the converged workspace

## Closure Notes

- Guided onboarding, bulk repricing, individual stock movements, and bulk imports are all operational from `/products`
- `/catalog` and `/inventory` are no longer used by the application runtime or UI regression suite
- The rail, smoke suite, and real-backend UI module suite now validate the converged route model
- The primary CTA `Nuevo producto` now opens `/products/sourcing`, so single-product onboarding follows the external-sourcing-assisted path instead of the older manual modal
- Secondary admin actions were compacted behind a three-dots menu; later UX iteration restored a visible bulk profile edit action (`Modificar ficha de productos`) next to `Actualizar precios`
- Bulk product profile editing now supports per-product changes for key fields (`nombre`, `precio`, `costo`, `stock mínimo`, `activo`) plus optional stock target adjustment through stock movement commands
- Bulk product profile modal confirmation now renders per-field before/after values (old vs new) with product thumbnail to improve operator validation before apply
- Top action buttons in `/products` were compacted and aligned to a single desktop row (`Nuevo producto`, `Actualizar precios`, `Modificar ficha de productos`, and overflow actions)
- Bulk action wizards now use distinct CTA copy between review and final apply steps (`Continuar a confirmar` / `Revisar cambios` -> `Aplicar cambios`) to avoid double-confirm confusion
- `EAN` is now part of the converged workspace contract: it is persisted on `products`, searchable from the `/products` list, and only displayed inside the detail modal to preserve browsing density
