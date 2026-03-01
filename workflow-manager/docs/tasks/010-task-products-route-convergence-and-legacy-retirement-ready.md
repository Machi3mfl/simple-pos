# Task: [TASK-010] Retire Legacy `/catalog` and `/inventory` Fallbacks After Parity

## Task Overview

**Document ID**: `010`
**File Name**: `010-task-products-route-convergence-and-legacy-retirement-ready.md`
**Feature**: `PRODUCTS-003`
**Entity**: `task`
**Pull Request**: `TBD`
**Status**: `ready`
**GitHub Issue**: #27  
**Priority**: `medium`
**Assignee**: `TBD`
**Estimated Effort**: `8h`
**Actual Effort**: `0h`

### Business Logic Description

Remove the remaining operational dependency on `/catalog` and `/inventory` once `/products` reaches parity, and converge the product administration experience onto a single workspace.

### Business Rules

- Retirement cannot happen before onboarding and bulk price update parity are complete
- Route behavior must remain safe for existing bookmarks or direct links
- Documentation and regression suites must reflect the new single-workspace model

---

## Acceptance Criteria

### Functional Requirements

- [ ] **Given** parity is complete in `/products`, **When** the operator uses product administration flows, **Then** they no longer need `/catalog` or `/inventory`
- [ ] **Given** a direct visit to `/catalog` or `/inventory`, **When** the legacy routes are retired, **Then** the system redirects or shows a clear deprecation path
- [ ] **Given** the rail and navigation smoke tests run, **When** they complete, **Then** the converged route model is covered

### Non-Functional Requirements

- [ ] Usability: the converged flow reduces context switching for the operator
- [ ] Maintainability: duplicate product administration UI is removed or explicitly demoted
- [ ] Reliability: route changes do not break the existing real-backend suite

### Error Handling

- [ ] **Given** a regression appears after route convergence, **When** the suite fails, **Then** the retirement batch must stop before removing the fallback completely

---

## Technical Implementation

### Files to Create/Modify

- `src/modules/sales/presentation/components/PosLayout.tsx`
- `src/modules/sales/presentation/posWorkspace.ts`
- `src/app/catalog/page.tsx`
- `src/app/inventory/page.tsx`
- `workflow-manager/docs/features/PRODUCTS-003-products-workspace-parity-and-catalog-convergence-draft.md`

### Dependencies

- `TASK-007`
- `TASK-008`
- `TASK-009`

---

## Testing Requirements

- [ ] Real UI E2E for converged navigation
- [ ] Smoke regression for route entry points
- [ ] Workflow and traceability docs refreshed after route retirement

---

## GitHub Issue Seed

**Title**: `[TASK-010] Retire Legacy /catalog and /inventory Fallbacks After Parity`
**Issue Template**: `05-task.yml`
**task_id**: `TASK-010`
**task_doc**: `workflow-manager/docs/tasks/010-task-products-route-convergence-and-legacy-retirement-ready.md`
**linked_feature**: `PRODUCTS-003`

---

## Definition of Done

- [ ] `/products` is the single operational workspace for product administration
- [ ] Legacy fallback routes are retired safely
- [ ] Tests and workflow docs are updated
