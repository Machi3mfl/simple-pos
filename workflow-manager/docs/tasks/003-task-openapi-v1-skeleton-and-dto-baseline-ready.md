# Task: [TASK-003] Define OpenAPI v1 Skeleton and DTO Baseline

## Task Overview

**Document ID**: `003`  
**File Name**: `003-task-openapi-v1-skeleton-and-dto-baseline-ready.md`  
**Feature**: `API-001`  
**Entity**: `task`  
**Pull Request**: `TBD`  
**Status**: `done`  
**GitHub Issue**: #10  
**Priority**: `high`  
**Assignee**: `TBD`  
**Estimated Effort**: `8h`  
**Actual Effort**: `6h`

### Business Logic Description
Create contract-first API baseline (`/api/v1`) with core schemas for sales, stock movements, debt, and sync so frontend and mock runtime can evolve with stable contracts.

### Business Rules
- Endpoint versioning must use `/api/v1`.
- `CreateStockMovementDTO` requires `unitCost` for inbound.
- Sales payment method schema only allows `cash` and `on_account`.

---

## Acceptance Criteria

### Functional Requirements
- [x] **Given** PRD API boundaries, **When** OpenAPI skeleton is created, **Then** all MVP endpoints are listed with request/response schemas.
- [x] **Given** payment constraints, **When** sale schema is defined, **Then** only `cash`/`on_account` are accepted.
- [x] **Given** offline requirement, **When** sync endpoint schema is added, **Then** it supports idempotency key fields per event.

### Non-Functional Requirements
- [x] Maintainability: schemas are reusable and clearly named.
- [x] Reliability: contract validation can be used by mocked runtime tests.
- [x] Compatibility: changes are additive and backward-compatible in v1.

### Error Handling
- [x] **Given** invalid DTO shape, **When** validation runs, **Then** standardized error shape is returned.
- [x] **Given** unsupported payment method, **When** request is submitted, **Then** contract rejects it.

---

## Technical Implementation

### Files to Create/Modify
- `src/app/api/v1/openapi.yaml` (create)
- `src/modules/**/presentation/dtos/*.ts` (create/modify)
- `workflow-manager/docs/features/API-001-contracts-v1-and-mock-runtime-draft.md` (update with links)

### Current Output
- `src/app/api/v1/openapi.yaml` (created)
- DTO baseline created in:
  - `src/modules/catalog/presentation/dtos/`
  - `src/modules/sales/presentation/dtos/`
  - `src/modules/inventory/presentation/dtos/`
  - `src/modules/reporting/presentation/dtos/`
  - `src/modules/customers/presentation/dtos/`
  - `src/modules/accounts-receivable/presentation/dtos/`
  - `src/modules/sync/presentation/dtos/`
- Contract conformance tests:
  - `tests/e2e/api-contract-conformance.spec.ts`
  - `tests/fixtures/mock-api/*.json` mapped to DTO response/error schemas

### Dependencies
- `TASK-001`
- `TASK-002`

---

## Testing Requirements

- [x] Contract lint/validation script passes.
- [x] Example payloads validated against schemas.
- [x] Mock fixtures mapped to contract shapes.

Validation evidence:

```bash
npx -y @redocly/cli@latest lint src/app/api/v1/openapi.yaml
npx playwright test tests/e2e/api-contract-conformance.spec.ts
```

---

## GitHub Issue Seed

**Title**: `[TASK-003] Define OpenAPI v1 Skeleton and DTO Baseline`  
**Issue Template**: `05-task.yml`  
**task_id**: `TASK-003`  
**task_doc**: `workflow-manager/docs/tasks/003-task-openapi-v1-skeleton-and-dto-baseline-ready.md`  
**linked_feature**: `API-001`

---

## Definition of Done

- [x] OpenAPI v1 skeleton committed.
- [x] DTO baseline documented.
- [x] Contract review approved.
