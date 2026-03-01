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
- Adding new pricing strategies beyond the current bulk price update modes

---

## Acceptance Criteria

- [x] Guided onboarding is reachable from `/products` without sending the operator to `/catalog`
- [x] Bulk price update with preview and audit summary is reachable from `/products`
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
