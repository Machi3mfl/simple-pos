# Task: [TASK-006] Add Playwright Mock Smoke and UI Baseline Checks

## Task Overview

**Document ID**: `006`  
**File Name**: `006-task-playwright-mock-smoke-and-visual-baseline-ready.md`  
**Feature**: `POS-001, API-001`  
**Entity**: `task`  
**Pull Request**: `TBD`  
**Status**: `ready`  
**GitHub Issue**: #13  
**Priority**: `high`  
**Assignee**: `TBD`  
**Estimated Effort**: `8h`  
**Actual Effort**: `0h`

### Business Logic Description
Create mock-based smoke E2E suite for checkout and add visual baseline assertions to detect unintended UI drift from approved POS design.

### Business Rules
- E2E must run without fully functional backend (mock mode).
- Smoke flow must include allowed payment methods and checkout success path.
- Visual baseline checks must cover the key three-zone layout.

---

## Acceptance Criteria

### Functional Requirements
- [ ] **Given** mock mode enabled, **When** smoke suite runs, **Then** main checkout path passes.
- [ ] **Given** unsupported payment method attempt, **When** test executes, **Then** UI/API rejection is observed.
- [ ] **Given** POS page render, **When** baseline check runs, **Then** left nav, center catalog, and right order panel are present.

### Non-Functional Requirements
- [ ] Reliability: tests are deterministic in CI.
- [ ] Maintainability: fixtures are readable and contract-aligned.
- [ ] Auditability: test evidence includes screenshots/traces for failures.

### Error Handling
- [ ] **Given** mock fixture drift, **When** suite starts, **Then** contract failure is surfaced clearly.
- [ ] **Given** visual regression, **When** snapshot check fails, **Then** diff evidence is generated.

---

## Technical Implementation

### Files to Create/Modify
- `tests/e2e/pos-checkout-smoke.spec.ts` (create)
- `tests/e2e/pos-visual-baseline.spec.ts` (create)
- `tests/fixtures/mock-api/*.json` (create/modify)
- `playwright.config.ts` (create/modify)

### Dependencies
- `TASK-003`
- `TASK-004`
- `TASK-005`

---

## Testing Requirements

- [ ] E2E runs locally and in CI mock mode.
- [ ] Visual comparison threshold documented.
- [ ] Failure artifacts (trace/screenshot/video) collected.

---

## GitHub Issue Seed

**Title**: `[TASK-006] Add Playwright Mock Smoke and UI Baseline Checks`  
**Issue Template**: `05-task.yml`  
**task_id**: `TASK-006`  
**task_doc**: `workflow-manager/docs/tasks/006-task-playwright-mock-smoke-and-visual-baseline-ready.md`  
**linked_feature**: `POS-001, API-001`

---

## Definition of Done

- [ ] Smoke E2E suite passes in mock mode.
- [ ] Visual baseline checks added and stable.
- [ ] Test evidence integrated into PR template.
