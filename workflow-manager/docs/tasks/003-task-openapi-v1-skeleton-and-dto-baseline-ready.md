# Task: [TASK-003] Define OpenAPI v1 Skeleton and DTO Baseline

## Task Overview

**Document ID**: `003`  
**File Name**: `003-task-openapi-v1-skeleton-and-dto-baseline-ready.md`  
**Feature**: `API-001`  
**Entity**: `task`  
**Pull Request**: `TBD`  
**Status**: `ready`  
**GitHub Issue**: #10  
**Priority**: `high`  
**Assignee**: `TBD`  
**Estimated Effort**: `8h`  
**Actual Effort**: `0h`

### Business Logic Description
Create contract-first API baseline (`/api/v1`) with core schemas for sales, stock movements, debt, and sync so frontend and mock runtime can evolve with stable contracts.

### Business Rules
- Endpoint versioning must use `/api/v1`.
- `CreateStockMovementDTO` requires `unitCost` for inbound.
- Sales payment method schema only allows `cash` and `on_account`.

---

## Acceptance Criteria

### Functional Requirements
- [ ] **Given** PRD API boundaries, **When** OpenAPI skeleton is created, **Then** all MVP endpoints are listed with request/response schemas.
- [ ] **Given** payment constraints, **When** sale schema is defined, **Then** only `cash`/`on_account` are accepted.
- [ ] **Given** offline requirement, **When** sync endpoint schema is added, **Then** it supports idempotency key fields per event.

### Non-Functional Requirements
- [ ] Maintainability: schemas are reusable and clearly named.
- [ ] Reliability: contract validation can be used by mocked runtime tests.
- [ ] Compatibility: changes are additive and backward-compatible in v1.

### Error Handling
- [ ] **Given** invalid DTO shape, **When** validation runs, **Then** standardized error shape is returned.
- [ ] **Given** unsupported payment method, **When** request is submitted, **Then** contract rejects it.

---

## Technical Implementation

### Files to Create/Modify
- `src/app/api/v1/openapi.yaml` (create)
- `src/modules/**/presentation/dtos/*.ts` (create/modify)
- `workflow-manager/docs/features/API-001-contracts-v1-and-mock-runtime-draft.md` (update with links)

### Dependencies
- `TASK-001`
- `TASK-002`

---

## Testing Requirements

- [ ] Contract lint/validation script passes.
- [ ] Example payloads validated against schemas.
- [ ] Mock fixtures mapped to contract shapes.

---

## GitHub Issue Seed

**Title**: `[TASK-003] Define OpenAPI v1 Skeleton and DTO Baseline`  
**Issue Template**: `05-task.yml`  
**task_id**: `TASK-003`  
**task_doc**: `workflow-manager/docs/tasks/003-task-openapi-v1-skeleton-and-dto-baseline-ready.md`  
**linked_feature**: `API-001`

---

## Definition of Done

- [ ] OpenAPI v1 skeleton committed.
- [ ] DTO baseline documented.
- [ ] Contract review approved.
