# Task: [TASK-005] Implement Checkout Payment Rules (`cash` / `on_account`)

## Task Overview

**Document ID**: `005`  
**File Name**: `005-task-checkout-payment-rules-cash-on-account-ready.md`  
**Feature**: `POS-001, AR-001`  
**Entity**: `task`  
**Pull Request**: `TBD`  
**Status**: `ready`  
**GitHub Issue**: #12  
**Priority**: `high`  
**Assignee**: `TBD`  
**Estimated Effort**: `10h`  
**Actual Effort**: `0h`

### Business Logic Description
Implement checkout rules so v1 only accepts `cash` and `on_account`, and requires customer selection when using `on_account`.

### Business Rules
- `paymentMethod` allowed values are only `cash` and `on_account`.
- `on_account` checkout requires existing/new customer assignment.
- Unsupported methods are blocked both in UI and API validation.

---

## Acceptance Criteria

### Functional Requirements
- [ ] **Given** checkout action, **When** payment method is missing, **Then** confirmation is blocked.
- [ ] **Given** payment method `on_account`, **When** no customer is selected, **Then** checkout is blocked with clear feedback.
- [ ] **Given** payment method `cash`, **When** checkout is confirmed, **Then** sale is persisted without customer requirement.

### Non-Functional Requirements
- [ ] Reliability: rule is enforced consistently in UI and server validation.
- [ ] Usability: error messages are understandable for non-technical operator.
- [ ] Maintainability: rule logic is centralized in use case/domain service.

### Error Handling
- [ ] **Given** unsupported payment method payload, **When** API receives request, **Then** returns validation error.
- [ ] **Given** customer lookup failure, **When** `on_account` checkout proceeds, **Then** checkout aborts safely without partial persistence.

---

## Technical Implementation

### Files to Create/Modify
- `src/modules/sales/application/use-cases/CreateSaleUseCase.ts` (create/modify)
- `src/modules/sales/presentation/components/CheckoutPanel.tsx` (create/modify)
- `src/modules/sales/presentation/dtos/CreateSaleDTO.ts` (create/modify)
- `src/modules/customers/application/use-cases/FindOrCreateCustomerUseCase.ts` (create/modify)
- `src/app/api/v1/sales/route.ts` (create/modify)

### Dependencies
- `TASK-003`
- `TASK-004`

---

## Testing Requirements

- [ ] Unit tests for payment method validation.
- [ ] Integration test for `on_account` customer-required constraint.
- [ ] UI test for checkout blocking behavior.

---

## GitHub Issue Seed

**Title**: `[TASK-005] Implement Checkout Payment Rules (cash/on_account)`  
**Issue Template**: `05-task.yml`  
**task_id**: `TASK-005`  
**task_doc**: `workflow-manager/docs/tasks/005-task-checkout-payment-rules-cash-on-account-ready.md`  
**linked_feature**: `POS-001, AR-001`

---

## Definition of Done

- [ ] Payment rule enforced in UI + API.
- [ ] `on_account` customer requirement enforced.
- [ ] Tests and docs updated.
