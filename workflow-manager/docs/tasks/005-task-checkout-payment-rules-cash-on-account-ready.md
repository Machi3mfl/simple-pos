# Task: [TASK-005] Implement Checkout Payment Rules (`cash` / `on_account`)

## Task Overview

**Document ID**: `005`  
**File Name**: `005-task-checkout-payment-rules-cash-on-account-ready.md`  
**Feature**: `POS-001, AR-001`  
**Entity**: `task`  
**Pull Request**: `TBD`  
**Status**: `done`  
**GitHub Issue**: #12  
**Priority**: `high`  
**Assignee**: `TBD`  
**Estimated Effort**: `10h`  
**Actual Effort**: `8h`

### Business Logic Description
Implement checkout rules so v1 only accepts `cash` and `on_account`, and requires customer selection when using `on_account`.

### Business Rules
- `paymentMethod` allowed values are only `cash` and `on_account`.
- `on_account` checkout requires existing/new customer assignment.
- Unsupported methods are blocked both in UI and API validation.

---

## Acceptance Criteria

### Functional Requirements
- [x] **Given** checkout action, **When** payment method is missing, **Then** confirmation is blocked.
- [x] **Given** payment method `on_account`, **When** no customer is selected, **Then** checkout is blocked with clear feedback.
- [x] **Given** payment method `cash`, **When** checkout is confirmed, **Then** sale is persisted without customer requirement.

### Non-Functional Requirements
- [x] Reliability: rule is enforced consistently in UI and server validation.
- [x] Usability: error messages are understandable for non-technical operator.
- [x] Maintainability: rule logic is centralized in use case/domain service.

### Error Handling
- [x] **Given** unsupported payment method payload, **When** API receives request, **Then** returns validation error.
- [x] **Given** customer lookup failure, **When** `on_account` checkout proceeds, **Then** checkout aborts safely without partial persistence.

---

## Technical Implementation

### Files to Create/Modify
- `src/modules/sales/application/use-cases/CreateSaleUseCase.ts` (create/modify)
- `src/modules/sales/presentation/components/CheckoutPanel.tsx` (create)
- `src/modules/sales/presentation/dtos/create-sale.dto.ts` (modify)
- `src/modules/customers/application/use-cases/FindOrCreateCustomerUseCase.ts` (create/modify)
- `src/app/api/v1/sales/route.ts` (create/modify)

### Current Output
- `src/modules/sales/application/use-cases/CreateSaleUseCase.ts`
- `src/modules/sales/domain/entities/Sale.ts`
- `src/modules/sales/domain/errors/SaleDomainError.ts`
- `src/modules/sales/domain/repositories/SaleRepository.ts`
- `src/modules/sales/presentation/components/CheckoutPanel.tsx`
- `src/modules/sales/presentation/dtos/create-sale.dto.ts`
- `src/modules/sales/infrastructure/repositories/InMemorySaleRepository.ts`
- `src/modules/customers/application/use-cases/FindOrCreateCustomerUseCase.ts`
- `src/modules/customers/domain/entities/Customer.ts`
- `src/modules/customers/domain/repositories/CustomerRepository.ts`
- `src/modules/customers/infrastructure/repositories/InMemoryCustomerRepository.ts`
- `src/app/api/v1/sales/route.ts`
- `src/app/api/v1/openapi.yaml` (updated with additive `customerName`)
- Rule-focused automated coverage:
  - `tests/e2e/sales-payment-rules-unit.spec.ts`
  - `tests/e2e/sales-on-account-customer-constraint-integration.spec.ts`
  - `tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts`

### Dependencies
- `TASK-003`
- `TASK-004`

---

## Testing Requirements

- [x] Unit tests for payment method validation.
- [x] Integration test for `on_account` customer-required constraint.
- [x] UI test for checkout blocking behavior.

Validation evidence:

```bash
npx -y @redocly/cli@latest lint src/app/api/v1/openapi.yaml
npm run lint
npm run build
curl -X POST http://localhost:4010/api/v1/sales ...
```

---

## GitHub Issue Seed

**Title**: `[TASK-005] Implement Checkout Payment Rules (cash/on_account)`  
**Issue Template**: `05-task.yml`  
**task_id**: `TASK-005`  
**task_doc**: `workflow-manager/docs/tasks/005-task-checkout-payment-rules-cash-on-account-ready.md`  
**linked_feature**: `POS-001, AR-001`

---

## Definition of Done

- [x] Payment rule enforced in UI + API.
- [x] `on_account` customer requirement enforced.
- [x] Tests and docs updated.
