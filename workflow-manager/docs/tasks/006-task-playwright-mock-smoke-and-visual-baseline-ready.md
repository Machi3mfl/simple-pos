# Task: [TASK-006] Add Playwright Mock Smoke and UI Baseline Checks

## Task Overview

**Document ID**: `006`  
**File Name**: `006-task-playwright-mock-smoke-and-visual-baseline-ready.md`  
**Feature**: `POS-001, API-001`  
**Entity**: `task`  
**Pull Request**: `TBD`  
**Status**: `done`  
**GitHub Issue**: #13  
**Priority**: `high`  
**Assignee**: `TBD`  
**Estimated Effort**: `8h`  
**Actual Effort**: `6h`

### Business Logic Description
Create mock-based smoke E2E suite for checkout and add visual baseline assertions to detect unintended UI drift from approved POS design.

### Business Rules
- E2E must run without fully functional backend (mock mode).
- Smoke flow must include allowed payment methods and checkout success path.
- Visual baseline checks must cover the key three-zone layout.

---

## Acceptance Criteria

### Functional Requirements
- [x] **Given** mock mode enabled, **When** smoke suite runs, **Then** main checkout path passes.
- [x] **Given** unsupported payment method attempt, **When** test executes, **Then** UI/API rejection is observed.
- [x] **Given** POS page render, **When** baseline check runs, **Then** left nav, center catalog, and right order panel are present.

### Non-Functional Requirements
- [x] Reliability: tests are deterministic in CI.
- [x] Maintainability: fixtures are readable and contract-aligned.
- [x] Auditability: test evidence includes screenshots/traces for failures.

### Error Handling
- [x] **Given** mock fixture drift, **When** suite starts, **Then** contract failure is surfaced clearly.
- [x] **Given** visual regression, **When** snapshot check fails, **Then** diff evidence is generated.

---

## Technical Implementation

### Files to Create/Modify
- `tests/e2e/pos-checkout-smoke.spec.ts` (create)
- `tests/e2e/pos-visual-baseline.spec.ts` (create)
- `tests/fixtures/mock-api/*.json` (create/modify)
- `playwright.config.ts` (create/modify)
- `tests/e2e/pos-visual-baseline.spec.ts-snapshots/pos-tablet-layout-darwin.png` (create/update)
- `package.json` (scripts)
- `.gitignore` (playwright artifacts)
- `.nvmrc` (node version pinning for local consistency)

### Current Output
- E2E config: `playwright.config.ts`
- Smoke suite: `tests/e2e/pos-checkout-smoke.spec.ts`
- Visual baseline: `tests/e2e/pos-visual-baseline.spec.ts`
- Visual snapshot: `tests/e2e/pos-visual-baseline.spec.ts-snapshots/pos-tablet-layout-darwin.png`
- Mock API fixtures:
  - `tests/fixtures/mock-api/sale-cash-success.json`
  - `tests/fixtures/mock-api/sale-on-account-success.json`
  - `tests/fixtures/mock-api/sale-on-account-missing-customer-error.json`
  - `tests/fixtures/mock-api/sale-unsupported-method-error.json`
- Scripts:
  - `npm run test:e2e`
  - `npm run test:e2e:update`
  - `npm run test:e2e:ui`

### Dependencies
- `TASK-003`
- `TASK-004`
- `TASK-005`

---

## Testing Requirements

- [x] E2E runs locally and in CI mock mode.
- [x] Visual comparison threshold documented.
- [x] Failure artifacts (trace/screenshot/video) collected.

Validation evidence:

```bash
npm run test:e2e:update
npm run test:e2e
```

---

## GitHub Issue Seed

**Title**: `[TASK-006] Add Playwright Mock Smoke and UI Baseline Checks`  
**Issue Template**: `05-task.yml`  
**task_id**: `TASK-006`  
**task_doc**: `workflow-manager/docs/tasks/006-task-playwright-mock-smoke-and-visual-baseline-ready.md`  
**linked_feature**: `POS-001, API-001`

---

## Definition of Done

- [x] Smoke E2E suite passes in mock mode.
- [x] Visual baseline checks added and stable.
- [x] Test evidence integrated into PR template.
