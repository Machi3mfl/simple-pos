# Task: [TASK-007] Bring Guided Onboarding into `/products`

## Task Overview

**Document ID**: `007`
**File Name**: `007-task-products-onboarding-parity-in-workspace-ready.md`
**Feature**: `PRODUCTS-003`
**Entity**: `task`
**Pull Request**: `TBD`
**Status**: `ready`
**GitHub Issue**: #24  
**Priority**: `high`
**Assignee**: `TBD`
**Estimated Effort**: `10h`
**Actual Effort**: `0h`

### Business Logic Description

Move the guided product creation flow from the legacy catalog screen into the `/products` workspace so product administration no longer requires a context switch.

### Business Rules

- The onboarding flow must preserve the minimum-field approach already accepted in `CATALOG-001`
- Placeholder image behavior must remain deterministic
- Product creation must continue to initialize inventory consistently as established in `PRODUCTS-002`

---

## Acceptance Criteria

### Functional Requirements

- [ ] **Given** the operator is in `/products`, **When** they choose to create a product, **Then** the guided onboarding flow opens inside that workspace
- [ ] **Given** the product is created without an image, **When** the flow completes, **Then** the placeholder strategy still applies correctly
- [ ] **Given** the product is created with initial stock, **When** the flow completes, **Then** the product appears in `/products` and `/sales` with consistent stock

### Non-Functional Requirements

- [ ] Usability: the onboarding flow remains readable and operator-friendly for the approved target user
- [ ] Maintainability: existing catalog create logic is reused instead of duplicated
- [ ] Reliability: list refresh after create remains deterministic

### Error Handling

- [ ] **Given** invalid onboarding input, **When** submission is attempted, **Then** validation stays inside the workspace and no partial persistence happens
- [ ] **Given** creation fails after submit, **When** the error returns, **Then** the operator receives actionable feedback and can retry safely

---

## Technical Implementation

### Files to Create/Modify

- `src/modules/products/presentation/components/ProductsInventoryPanel.tsx`
- `src/modules/catalog/presentation/components/ProductOnboardingPanel.tsx`
- `src/modules/sales/presentation/components/PosLayout.tsx`
- `workflow-manager/docs/features/PRODUCTS-003-products-workspace-parity-and-catalog-convergence-draft.md`

### Dependencies

- `PRODUCTS-002`
- `CATALOG-001`

---

## Testing Requirements

- [ ] Real UI E2E for create flow from `/products`
- [ ] Cross-module E2E confirming visibility in `/sales`
- [ ] Regression check for placeholder behavior and inventory initialization

---

## GitHub Issue Seed

**Title**: `[TASK-007] Bring Guided Onboarding into /products`
**Issue Template**: `05-task.yml`
**task_id**: `TASK-007`
**task_doc**: `workflow-manager/docs/tasks/007-task-products-onboarding-parity-in-workspace-ready.md`
**linked_feature**: `PRODUCTS-003`

---

## Definition of Done

- [ ] Guided onboarding is available inside `/products`
- [ ] Product creation behavior matches the previous catalog flow
- [ ] Tests and workflow docs are updated
