# Task: [TASK-010] Retire Legacy `/catalog` and `/inventory` Fallbacks After Parity

## Task Overview

**Document ID**: `010`
**File Name**: `010-task-products-route-convergence-and-legacy-retirement-ready.md`
**Feature**: `PRODUCTS-003`
**Entity**: `task`
**Pull Request**: `TBD`
**Status**: `done`
**GitHub Issue**: #27  
**Priority**: `medium`
**Assignee**: `TBD`
**Estimated Effort**: `8h`
**Actual Effort**: `4h`

### Business Logic Description

Remove the remaining operational dependency on `/catalog` and `/inventory` once `/products` reaches parity, and converge the product administration experience onto a single workspace.

### Business Rules

- Retirement cannot happen before onboarding and bulk price update parity are complete
- Route behavior must remain safe for existing bookmarks or direct links
- Documentation and regression suites must reflect the new single-workspace model

---

## Acceptance Criteria

### Functional Requirements

- [x] **Given** parity is complete in `/products`, **When** the operator uses product administration flows, **Then** they no longer need `/catalog` or `/inventory`
- [x] **Given** parity is complete in `/products`, **When** the legacy workspaces are retired, **Then** the operational app surface no longer points to `/catalog` or `/inventory`
- [x] **Given** the rail and navigation smoke tests run, **When** they complete, **Then** the converged route model is covered

### Non-Functional Requirements

- [x] Usability: the converged flow reduces context switching for the operator
- [x] Maintainability: duplicate product administration UI is removed or explicitly demoted
- [x] Reliability: route changes do not break the existing real-backend suite

### Error Handling

- [x] **Given** a regression appears after route convergence, **When** the suite fails, **Then** the retirement batch must stop before removing the fallback completely

---

## Technical Implementation

### Files to Create/Modify

- `src/modules/sales/presentation/components/PosLayout.tsx`
- `src/modules/sales/presentation/posWorkspace.ts`
- `workflow-manager/docs/features/PRODUCTS-003-products-workspace-parity-and-catalog-convergence-draft.md`

### Dependencies

- `TASK-007`
- `TASK-008`
- `TASK-009`

---

## Testing Requirements

- [x] Real UI E2E for converged navigation
- [x] Smoke regression for route entry points
- [x] Workflow and traceability docs refreshed after route retirement

---

## GitHub Issue Seed

**Title**: `[TASK-010] Retire Legacy /catalog and /inventory Fallbacks After Parity`
**Issue Template**: `05-task.yml`
**task_id**: `TASK-010`
**task_doc**: `workflow-manager/docs/tasks/010-task-products-route-convergence-and-legacy-retirement-ready.md`
**linked_feature**: `PRODUCTS-003`

---

## Definition of Done

- [x] `/products` is the single operational workspace for product administration
- [x] Legacy fallback routes are retired safely
- [x] Tests and workflow docs are updated

## Implementation Notes

- `catalog` and `inventory` were removed from the operational workspace enum in `PosLayout`
- no runtime route, navigation item, or UI regression flow points to `/catalog` or `/inventory`
- the regression suite now validates onboarding, bulk repricing, and stock operations directly from `/products`
