# [AR-001] Feature: On-Account Debt and Debt Payments

## Metadata

**Feature ID**: `AR-001`  
**Status**: `draft`  
**Priority**: `high`  
**Linked PBIs**: `PBI-014`, `PBI-015`, `PBI-016`  
**Linked FR/NFR**: `FR-011`, `FR-012`, `FR-013`, `NFR-006`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`

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
  amount: number;
  paymentMethod: "cash";
  notes?: string;
}
```

---

## Acceptance Criteria

- [ ] `on_account` checkout is blocked if customer is missing.
- [ ] Debt entries are stored per originating order.
- [ ] Debt payments create immutable ledger events.
- [ ] Outstanding balance decreases correctly for partial and full payments.

