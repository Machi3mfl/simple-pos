# [POS-001] Feature: UI POS Mockup and Checkout

## Metadata

**Feature ID**: `POS-001`  
**Status**: `in_progress`  
**GitHub Issue**: #7  
**Priority**: `high`  
**Linked PBIs**: `PBI-001`, `PBI-002`, `PBI-005`  
**Linked FR/NFR**: `FR-001`, `FR-002`, `NFR-002`, `NFR-005`  
**Planning Reference**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`
**Architecture Artifacts**: `workflow-manager/docs/planning/diagrams/class-mvp-domain.md`

---

## Business Goal

Deliver a tablet-first POS screen that allows fast selling with minimal reading: category tabs, product cards, cart, and checkout with allowed payment methods.

## Visual Reference (Source of Truth)

This feature must follow the UI reference image approved by the user in this project discussion.
Canonical reference doc: `workflow-manager/docs/planning/005-ui-reference-pos-v1-draft.md`.

### Visual Contract for MVP
- Left dark navigation rail with icon-driven options.
- Center content area with:
  - category row on top,
  - product cards grid as primary interaction surface.
- Right order panel with:
  - order list,
  - subtotal/discount/tax/total summary,
  - prominent checkout action button.
- Large clickable controls and clear text hierarchy for 60+ operator.

## Use Case Summary

**Primary Actor**: kiosk operator  
**Trigger**: customer wants to buy  
**Main Flow**:
1. Operator selects products from visual grid.
2. Operator adjusts quantities in cart.
3. Operator chooses payment method (`cash` or `on_account`).
4. System confirms checkout and shows summary.

**Key Rules**
- Only `cash` and `on_account` are valid payment methods in v1.
- Touch targets and readability must satisfy usability thresholds.

---

## API / Code Examples

```ts
export type PaymentMethod = "cash" | "on_account";

export interface CreateSaleDTO {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  customerId?: string; // required when paymentMethod = "on_account"
}
```

```bash
curl -X POST /api/v1/sales \
  -H "content-type: application/json" \
  -d '{
    "items":[{"productId":"prod_123","quantity":2}],
    "paymentMethod":"cash"
  }'
```

---

## Acceptance Criteria

- [ ] Tablet viewport is primary optimized layout.
- [ ] Checkout blocks unsupported payment methods.
- [ ] Checkout summary is visible and understandable for 60+ operator.
- [x] Basic checkout happy path is covered by mock E2E.
- [ ] Implemented UI matches approved visual structure (left nav + catalog center + order panel right).
- [ ] Product cards, category chips, and checkout action preserve large-target touch usability.

## Current Output

- Tablet-first POS mockup route: `src/app/(admin)/pos/page.tsx`
- Modular UI sections:
  - `src/modules/sales/presentation/components/PosLayout.tsx`
  - `src/modules/sales/presentation/components/LeftNavRail.tsx`
  - `src/modules/sales/presentation/components/ProductCatalogPanel.tsx`
  - `src/modules/sales/presentation/components/CheckoutPanel.tsx`
- Root route redirect to POS demo: `src/app/page.tsx` -> `/pos`
- Checkout rule integration:
  - only `cash` and `on_account`
  - `on_account` requires customer name in UI and API validation
- Mock E2E coverage:
  - `tests/e2e/pos-checkout-smoke.spec.ts`
  - `tests/e2e/pos-visual-baseline.spec.ts`
