# [AR-001] Feature: On-Account Debt and Debt Payments

## Metadata

**Feature ID**: `AR-001`  
**Status**: `done`  
**GitHub Issue**: #5  
**Priority**: `high`  
**Linked PBIs**: `PBI-014`, `PBI-015`, `PBI-016`  
**Linked FR/NFR**: `FR-011`, `FR-012`, `FR-013`, `NFR-006`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`
**Architecture Artifacts**: `workflow-manager/docs/planning/diagrams/class-mvp-domain.md`

---

## Business Goal

Support selling "a cuenta" (`on_account`) while preserving debt traceability by customer and order, and allow debt reduction through registered payments.

## Use Case Summary

**Primary Actor**: operator/support admin  
**Trigger**: checkout with `on_account` or later debt payment  
**Main Flow**:
1. Operator marks payment method as `on_account`.
2. System requires customer selection/creation.
3. Sale is confirmed and debt ledger entry is created by order.
4. Admin can register payment to reduce outstanding balance.

---

## API / Code Examples

```bash
curl -X POST /api/v1/sales \
  -H "content-type: application/json" \
  -d '{
    "items":[{"productId":"prod_123","quantity":1}],
    "paymentMethod":"on_account",
    "customerId":"cust_456"
  }'
```

```ts
export interface CreateDebtPaymentDTO {
  customerId: string;
  orderId?: string;
  amount: number;
  paymentMethod: "cash";
  notes?: string;
}
```

---

## Acceptance Criteria

- [x] `on_account` checkout is blocked if customer is missing.
- [x] Debt entries are stored per originating order.
- [x] Debt payments create immutable ledger events.
- [x] Outstanding balance decreases correctly for partial and full payments.
- [x] On-account checkout can register an initial partial payment and leave only the remainder outstanding.
- [x] Order-specific payments can target one sale directly from the Orders snapshot.

## Current Output

- `on_account` validation now enforced in:
  - `src/modules/sales/presentation/components/CheckoutPanel.tsx`
  - `src/modules/sales/presentation/dtos/create-sale.dto.ts`
  - `src/modules/sales/application/use-cases/CreateSaleUseCase.ts`
  - `src/app/api/v1/sales/route.ts`
- Quick customer assignment flow implemented with:
  - `src/modules/customers/application/use-cases/FindOrCreateCustomerUseCase.ts`
- Accounts receivable ledger module added:
  - Domain:
    - `src/modules/accounts-receivable/domain/entities/DebtLedgerEntry.ts`
    - `src/modules/accounts-receivable/domain/services/CalculateOutstandingBalance.ts`
    - `src/modules/accounts-receivable/domain/services/SummarizeDebtByOrder.ts`
    - `src/modules/accounts-receivable/domain/repositories/DebtLedgerRepository.ts`
  - Application:
    - `RecordOnAccountDebtUseCase`
    - `RegisterDebtPaymentUseCase`
    - `GetCustomerDebtSummaryUseCase`
    - `OnAccountDebtRecorderAdapter`
  - Infrastructure:
    - `src/modules/accounts-receivable/infrastructure/repositories/InMemoryDebtLedgerRepository.ts`
- New API routes:
  - `POST /api/v1/debt-payments`
  - `GET /api/v1/customers/{id}/debt`
- AR UI surface integrated:
  - `src/modules/accounts-receivable/presentation/components/DebtManagementPanel.tsx`
  - mounted from `src/modules/sales/presentation/components/PosLayout.tsx` (`Receivables`)
  - uses `no-store` reads for candidate/summary consistency and supports refresh token from checkout flow
  - stable UI selectors (`data-testid`) added for candidate/select/load/payment/ledger actions
- Sales integration:
  - `CreateSaleUseCase` now records debt entry for `on_account` sales with `orderId = saleId`.
  - `CreateSaleUseCase` accepts `initialPaymentAmount` for `on_account` and records the immediate payment as a second immutable ledger event.
  - `RegisterDebtPaymentUseCase` accepts optional `orderId` so a payment can reduce one specific order instead of the full customer balance.
- `PosLayout` propagates a sales refresh token after checkout success to refresh `Receivables`
- Test evidence:
  - `tests/e2e/ar-debt-ledger-and-payments-api.spec.ts`
  - `tests/e2e/ar-ui-checkout-on-account-and-payment.spec.ts`
