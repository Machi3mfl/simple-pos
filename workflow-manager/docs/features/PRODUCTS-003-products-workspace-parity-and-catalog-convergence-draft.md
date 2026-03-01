# [PRODUCTS-003] Feature: Products Workspace Parity and Catalog Convergence

## Metadata

**Feature ID**: `PRODUCTS-003`
**Status**: `ready`
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

- [ ] Guided onboarding is reachable from `/products` without sending the operator to `/catalog`
- [ ] Bulk price update with preview and audit summary is reachable from `/products`
- [ ] The batch import UX decision is explicitly documented and reflected in the workspace UI
- [ ] `/catalog` and `/inventory` are no longer required for daily product administration
- [ ] UI, API, persistence, and E2E docs remain aligned after the convergence

---

## Planned Task Breakdown

- `TASK-007` Bring guided onboarding into `/products`
- `TASK-008` Bring bulk price update preview and apply into `/products`
- `TASK-009` Decide the batch import preview and dry-run UX for `/products`
- `TASK-010` Retire `/catalog` and `/inventory` fallbacks after parity closes

---

## Definition of Done

- [ ] `/products` covers the remaining admin flows that still depend on `/catalog`
- [ ] Legacy fallback routes are either redirected or explicitly demoted to non-operational deep links
- [ ] Workflow docs and GitHub issues reflect the post-MVP convergence state
- [ ] Real-backend E2E coverage protects the converged workspace
