# [POS-001] Feature: UI POS Mockup and Checkout

## Metadata

**Feature ID**: `POS-001`  
**Status**: `done`  
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
  - compact subtotal/items/total summary,
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
  initialPaymentAmount?: number; // optional when paymentMethod = "on_account"
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

- [x] Tablet viewport is primary optimized layout.
- [x] Checkout blocks unsupported payment methods.
- [x] Checkout summary is visible and understandable for 60+ operator.
- [x] Basic checkout happy path is covered by mock E2E.
- [x] Implemented UI matches approved visual structure (left nav + catalog center + order panel right).
- [x] Product cards, category chips, and checkout action preserve large-target touch usability.
- [x] Side rail navigation opens each module UI surface while preserving `Sales` layout baseline.
- [x] Side rail exposes an `Orders` workspace with a list snapshot of recorded sales.

## Current Output

- Tablet-first POS mockup routes: `src/app/[workspace]/page.tsx` (`/sales`, `/orders`, `/catalog`, `/inventory`, `/receivables`, `/reporting`, `/sync`)
- Modular UI sections:
  - `src/modules/sales/presentation/components/PosLayout.tsx`
  - `src/modules/sales/presentation/components/LeftNavRail.tsx`
  - `src/modules/sales/presentation/components/ProductCatalogPanel.tsx`
  - `src/modules/sales/presentation/components/CheckoutPanel.tsx`
- Integrated side-rail workspaces in `PosLayout`:
  - `Sales`: POS catalog + cart + checkout
  - `Orders`: all recorded sales shown as a list snapshot
  - `Catalog`: onboarding + bulk price update UI
  - `Inventory`: stock movement UI
  - `Receivables`: debt management UI
  - `Reporting`: reporting/history UI
  - `Sync`: offline queue/sync UI
- Root route redirect to POS demo: `src/app/page.tsx` -> `/sales`
- UI interaction wiring added:
  - Catalog loaded from `GET /api/v1/products?activeOnly=true`
  - Category and search filtering in catalog panel
  - Product card click adds/increments cart lines
  - Cart quantity controls (`+` / `-`) update totals in real time
  - Checkout uses real product IDs from catalog data
  - Sales starts with an empty order list; no demo cart items are preloaded.
  - Sales no longer auto-seeds demo catalog products; empty catalog state routes operator to Catalog.
- Checkout rule integration:
  - only `cash` and `on_account`
  - `on_account` requires customer name in UI and API validation
  - cash checkout captures customer payment amount and calculates change due before confirming; blank cash input is treated as exact payment
  - on-account checkout can capture an initial partial payment and shows the remaining balance inline
- Checkout UX updates:
  - removed `discount` / `tax` rows from the live order panel for now
  - `Ir a cobrar` now opens a large checkout modal so payment becomes a focused final step
  - the checkout modal emphasizes total, method selection, cash received/change due, and remaining on-account balance
- Localization updates:
  - the POS shell now renders in Spanish by default through a typed i18n provider mounted in `src/app/layout.tsx`
  - navigation, catalog, checkout, orders, and support workspaces consume a centralized dictionary instead of embedded strings
  - category labels, payment methods, movement types, and debt status labels are resolved through shared translation helpers
- Mock E2E coverage:
  - `tests/e2e/pos-checkout-smoke.spec.ts`
  - `tests/e2e/pos-visual-baseline.spec.ts`
  - `tests/e2e/ui-vertical-slices-smoke.spec.ts`
  - deterministic UI fixtures for product catalog in POS specs
- Real-backend Orders snapshot coverage:
  - `tests/e2e/orders-ui-sales-snapshot.spec.ts`
