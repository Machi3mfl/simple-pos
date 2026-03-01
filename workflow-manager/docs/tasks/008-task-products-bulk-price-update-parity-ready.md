# Task: [TASK-008] Bring Bulk Price Update into `/products`

## Task Overview

**Document ID**: `008`
**File Name**: `008-task-products-bulk-price-update-parity-ready.md`
**Feature**: `PRODUCTS-003`
**Entity**: `task`
**Pull Request**: `TBD`
**Status**: `ready`
**GitHub Issue**: #25  
**Priority**: `high`
**Assignee**: `TBD`
**Estimated Effort**: `12h`
**Actual Effort**: `0h`

### Business Logic Description

Move the bulk price update preview and apply workflow into `/products` so price administration no longer depends on the legacy catalog panel.

### Business Rules

- Existing bulk price update modes and validation rules must stay unchanged
- Preview must remain mandatory before apply
- Audit summary must preserve affected products, old prices, new prices, author, and timestamp

---

## Acceptance Criteria

### Functional Requirements

- [ ] **Given** the operator is in `/products`, **When** they open bulk price update, **Then** they can select scope, preview changes, and apply the batch without leaving the workspace
- [ ] **Given** the preview contains invalid results, **When** the operator attempts to continue, **Then** the flow blocks apply and explains the validation errors
- [ ] **Given** the batch is applied, **When** the workspace refreshes, **Then** the updated prices are visible in `/products` and `/sales`

### Non-Functional Requirements

- [ ] Usability: the flow remains understandable for a non-technical operator
- [ ] Maintainability: the existing pricing use case and contract are reused
- [ ] Auditability: apply results remain visible and test-covered

### Error Handling

- [ ] **Given** the preview request fails, **When** the operator retries, **Then** no partial apply happens
- [ ] **Given** the apply step fails, **When** the response returns, **Then** the UI preserves context and explains the failure clearly

---

## Technical Implementation

### Files to Create/Modify

- `src/modules/products/presentation/components/ProductsInventoryPanel.tsx`
- `src/modules/catalog/presentation/components/BulkPriceUpdatePanel.tsx`
- `src/app/api/v1/products/price-batches/route.ts`
- `workflow-manager/docs/features/PRODUCTS-003-products-workspace-parity-and-catalog-convergence-draft.md`

### Dependencies

- `TASK-007`
- `CATALOG-001`

---

## Testing Requirements

- [ ] Real UI E2E for preview and apply from `/products`
- [ ] API contract regression for `/api/v1/products/price-batches`
- [ ] Cross-module check confirming `/sales` reflects updated prices

---

## GitHub Issue Seed

**Title**: `[TASK-008] Bring Bulk Price Update into /products`
**Issue Template**: `05-task.yml`
**task_id**: `TASK-008`
**task_doc**: `workflow-manager/docs/tasks/008-task-products-bulk-price-update-parity-ready.md`
**linked_feature**: `PRODUCTS-003`

---

## Definition of Done

- [ ] Bulk price update can be completed from `/products`
- [ ] Preview and audit summary remain intact
- [ ] Tests and workflow docs are updated
