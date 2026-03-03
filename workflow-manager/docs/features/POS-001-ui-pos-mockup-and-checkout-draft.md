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

- Tablet-first POS mockup routes: `src/app/[workspace]/page.tsx` (`/sales`, `/orders`, `/products`, `/receivables`, `/reporting`, `/sync`)
- `Products` is the single operational workspace for product and inventory administration
- Modular UI sections:
  - `src/modules/sales/presentation/components/PosLayout.tsx`
  - `src/modules/sales/presentation/components/LeftNavRail.tsx`
  - `src/modules/sales/presentation/components/ProductCatalogPanel.tsx`
  - `src/modules/sales/presentation/components/CheckoutPanel.tsx`
- Integrated side-rail workspaces in `PosLayout`:
  - `Sales`: POS catalog + cart + checkout
  - `Orders`: all recorded sales shown as a list snapshot
  - `Products`: unified real workspace for products and inventory operations
  - `Receivables`: debt management UI
  - `Reporting`: reporting/history UI
  - `Sync`: offline queue/sync UI
- Legacy direct routes outside the rail:
  - `Catalog`: onboarding + bulk price update UI
  - `Inventory`: stock movement UI
- Root route redirect to POS demo: `src/app/page.tsx` -> `/sales`
- UI interaction wiring added:
  - Catalog loaded from `GET /api/v1/products?activeOnly=true`
  - Category and search filtering in catalog panel
  - Category chips now keep a consistent max width and horizontally scroll when the operator has more categories than the available viewport
  - Category chips were compacted further for dense catalogs: reduced spacing, larger label text for readability, smaller shadows that stay inside the row container, and label truncation after 10 visible characters
  - The sales catalog now collapses legacy category aliases such as `snack` and `snacks` into a single visible chip so the operator does not see duplicated categories
  - Product list now sorts alphabetically in the sales view and exposes an A-Z quick-jump rail with animated scrolling that tracks the current visible letter while scrolling
  - Product card click adds/increments cart lines
  - Product cards clamp the title to two lines, keep availability + price pinned to the bottom edge, tighten subtitle-to-footer spacing for denser browsing, and show current stock inside the availability badge
  - The catalog scroll area now exposes a floating "back to top" action once the operator has moved down the product list
  - Cart quantity controls (`+` / `-`) update totals in real time
  - Order-list items now prioritize the full product title on the first row, show the real product image beside quantity controls on the second row, and expose a dedicated delete action with a red trash-can icon
  - The order summary now keeps the totals/payment card fixed by layout while the order-item list scrolls independently inside its own panel area
  - Checkout uses real product IDs from catalog data
  - Sales starts with an empty order list; no demo cart items are preloaded.
  - Sales no longer auto-seeds demo catalog products; empty catalog state routes operator to Products.
- Checkout rule integration:
  - only `cash` and `on_account`
  - `on_account` no longer accepts a free-text customer field as the primary path: the cashier must select an existing customer from guided search/recent suggestions or explicitly confirm creating a new one
  - customer creation for `on_account` is explicit in the API through `createCustomerIfMissing`; plain `customerName` without confirmation is rejected
  - cash checkout captures customer payment amount and calculates change due before confirming; blank cash input is treated as exact payment
  - on-account checkout can capture an initial partial payment and shows the remaining balance inline
  - checkout and downstream reporting now persist the sale-line unit price snapshot in `sale_items.unit_price`, so account-balance validation and totals use the real product price instead of the legacy placeholder constant
- Checkout UX updates:
  - removed `discount` / `tax` rows from the live order panel for now
  - `Go to checkout` now opens a large checkout modal so payment becomes a focused final step
  - the checkout modal emphasizes total, method selection, cash received/change due, and remaining on-account balance
  - the checkout modal now stays pinned inside the viewport with internal scroll, a fixed action footer, and a stable customer-search area so the sheet no longer jumps while the operator types
  - the checkout modal now uses the same centered shell language as the order-detail modal, including a top-right close icon, so modal interactions stay visually consistent across POS flows
  - checkout feedback now uses a reusable shadcn toast mounted globally in `src/app/layout.tsx`, with floating success/error/info variants, iconography, POS-aligned colors, and a 10-second visibility window instead of the old inline green status block
  - the on-account path now uses a guided customer selector built as a shadcn autocomplete dropdown, showing recent customers and live matches directly under the input, with explicit "create new customer" action and a second warning step when there are similar names to reduce duplicate debt ledgers
  - server-side customer lookup now forces uncached Supabase reads inside App Router so newly created on-account customers appear immediately in recent matches and exact-name search
- Orders UX updates:
  - the `/orders` workspace now uses the same card scale, spacing, rounded surfaces, and emphasized totals as `/sales` and `/products`, with larger summary metrics and more visual sales cards
  - sale IDs remain available in automation selectors but are no longer rendered as visible card content for operators
  - `/orders` no longer registers payments directly; debt settlement remains in `/receivables`, while `orders` stays focused on snapshot and visual review
  - sale cards now show clearer payment-method iconography and stronger total/collected/outstanding hierarchy, with the three amounts moved to the upper-right area using one shared visual treatment, compact amount formatting that hides `.00`, and no inline customer strip on the card itself
  - order-level metric cards were tightened to content height across the summary row, sale list, and sale-detail modal so more information fits on screen without changing the overall visual language
  - clicking a sale card opens a detail modal with the purchased items, their stored product photos, quantities, and line totals, keeping the same modal language already used in checkout and products
- Localization updates:
  - the POS shell now renders in Spanish by default through a typed i18n provider mounted in `src/app/layout.tsx`
  - navigation, catalog, checkout, orders, and support workspaces consume a centralized dictionary instead of embedded strings
  - category labels, payment methods, movement types, and debt status labels are resolved through shared translation helpers
- Mock E2E coverage:
  - `tests/e2e/pos-checkout-smoke.spec.ts`
  - `tests/e2e/sales-checkout-toast-ui.spec.ts`
  - `tests/e2e/pos-visual-baseline.spec.ts`
  - `tests/e2e/ui-vertical-slices-smoke.spec.ts`
  - deterministic UI fixtures for product catalog in POS specs
- Real-backend Orders snapshot coverage:
  - `tests/e2e/orders-ui-sales-snapshot.spec.ts`
