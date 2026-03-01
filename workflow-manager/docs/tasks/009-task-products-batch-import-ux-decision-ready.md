# Task: [TASK-009] Decide Batch Import Preview and Dry-Run UX for `/products`

## Task Overview

**Document ID**: `009`
**File Name**: `009-task-products-batch-import-ux-decision-ready.md`
**Feature**: `PRODUCTS-003`
**Entity**: `task`
**Pull Request**: `TBD`
**Status**: `ready`
**GitHub Issue**: #26  
**Priority**: `medium`
**Assignee**: `TBD`
**Estimated Effort**: `6h`
**Actual Effort**: `0h`

### Business Logic Description

Decide whether the current paste-and-apply batch import flow in `/products` is sufficient, or whether the workspace needs a preview and dry-run step before persistence.

### Business Rules

- The decision must be based on operator safety and clarity, not only implementation cost
- If preview is deferred, that choice must be explicit and documented
- If preview is approved, scope and validation behavior must be clearly defined before implementation

---

## Acceptance Criteria

### Functional Requirements

- [ ] **Given** the current bulk import flows, **When** the decision review is completed, **Then** the team has a written go or no-go decision for preview and dry-run support
- [ ] **Given** preview is approved, **When** the task closes, **Then** the required UX states and API impacts are documented clearly enough for implementation
- [ ] **Given** preview is deferred, **When** the task closes, **Then** the current paste-and-apply flow is explicitly accepted and tracked as intentional behavior

### Non-Functional Requirements

- [ ] Usability: the decision rationale addresses the older-operator UX target
- [ ] Maintainability: the documented decision avoids ambiguous future scope
- [ ] Auditability: the decision is linked from workflow docs

### Error Handling

- [ ] **Given** the review finds unacceptable operator risk in the current flow, **When** the task closes, **Then** it must produce a follow-up implementation recommendation instead of a vague note

---

## Technical Implementation

### Files to Create/Modify

- `workflow-manager/docs/features/PRODUCTS-003-products-workspace-parity-and-catalog-convergence-draft.md`
- `workflow-manager/docs/features/PRODUCTS-002-unified-products-inventory-real-integration-plan.md`
- `workflow-manager/docs/planning/007-execution-status-simple-pos-ready.md`

### Dependencies

- `PRODUCTS-002`

---

## Testing Requirements

- [ ] No code-level validation required if the outcome is a documented decision only
- [ ] If the decision includes a UI prototype, add the corresponding mock or visual checkpoint reference

---

## GitHub Issue Seed

**Title**: `[TASK-009] Decide Batch Import Preview and Dry-Run UX for /products`
**Issue Template**: `05-task.yml`
**task_id**: `TASK-009`
**task_doc**: `workflow-manager/docs/tasks/009-task-products-batch-import-ux-decision-ready.md`
**linked_feature**: `PRODUCTS-003`

---

## Definition of Done

- [ ] A clear decision exists for preview and dry-run support
- [ ] The decision is linked from the related products docs
- [ ] Any required follow-up implementation is explicitly identified
