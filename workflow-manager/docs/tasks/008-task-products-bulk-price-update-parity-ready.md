# Task: [TASK-008] Bring Bulk Price Update into `/products`

## Task Overview

**Document ID**: `008`
**File Name**: `008-task-products-bulk-price-update-parity-ready.md`
**Feature**: `PRODUCTS-003`
**Entity**: `task`
**Pull Request**: `TBD`
**Status**: `done`
**GitHub Issue**: #25  
**Priority**: `high`
**Assignee**: `TBD`
**Estimated Effort**: `12h`
**Actual Effort**: `3h`

### Business Logic Description

Move the bulk price update preview and apply workflow into `/products` so price administration no longer depends on the legacy catalog panel.

### Business Rules

- Existing bulk price update modes and validation rules must stay unchanged
- Preview must remain mandatory before apply
- Audit summary must preserve affected products, old prices, new prices, author, and timestamp

---

## Acceptance Criteria

### Functional Requirements

- [x] **Given** the operator is in `/products`, **When** they open bulk price update, **Then** they can select scope, preview changes, and apply the batch without leaving the workspace
- [x] **Given** the preview contains invalid results, **When** the operator attempts to continue, **Then** the flow blocks apply and explains the validation errors
- [x] **Given** the batch is applied, **When** the workspace refreshes, **Then** the updated prices are visible in `/products` and `/sales`

### Non-Functional Requirements

- [x] Usability: the flow remains understandable for a non-technical operator
- [x] Maintainability: the existing pricing use case and contract are reused
- [x] Auditability: apply results remain visible and test-covered

### Error Handling

- [x] **Given** the preview request fails, **When** the operator retries, **Then** no partial apply happens
- [x] **Given** the apply step fails, **When** the response returns, **Then** the UI preserves context and explains the failure clearly

---

## Technical Implementation

### Files to Create/Modify

- `src/modules/products/presentation/components/ProductsInventoryPanel.tsx`
- `src/modules/catalog/presentation/components/BulkPriceUpdatePanel.tsx`
- `src/modules/catalog/presentation/hooks/useBulkPriceUpdate.ts`
- `src/app/api/v1/products/price-batches/route.ts`
- `tests/e2e/products-workspace-ui.spec.ts`
- `tests/e2e/catalog-bulk-price-update-api.spec.ts`
- `workflow-manager/docs/features/PRODUCTS-003-products-workspace-parity-and-catalog-convergence-draft.md`

### Dependencies

- `TASK-007`
- `CATALOG-001`

---

## Testing Requirements

- [x] Real UI E2E for preview and apply from `/products`
- [x] API contract regression for `/api/v1/products/price-batches`
- [x] Cross-module check confirming `/sales` reflects updated prices

---

## GitHub Issue Seed

**Title**: `[TASK-008] Bring Bulk Price Update into /products`
**Issue Template**: `05-task.yml`
**task_id**: `TASK-008`
**task_doc**: `workflow-manager/docs/tasks/008-task-products-bulk-price-update-parity-ready.md`
**linked_feature**: `PRODUCTS-003`

---

## Definition of Done

- [x] Bulk price update can be completed from `/products`
- [x] Preview and audit summary remain intact
- [x] Tests and workflow docs are updated
