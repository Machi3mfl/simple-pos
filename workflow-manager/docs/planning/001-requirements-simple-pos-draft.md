# Requirements Definition: simple-pos

## Document Metadata

**Document ID**: `001`  
**File Name**: `001-requirements-simple-pos-draft.md`  
**Status**: `in_review`  
**Priority**: `high`  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.8`  
**Created At**: `2026-02-27`  
**Last Updated**: `2026-03-01`  
**Related Epic/Feature**: `pending-definition`  
**Related Planning Doc**: `002-prd-simple-pos-draft.md`, `003-backlog-simple-pos-draft.md`

---

> This document is a use-case decomposition complement. The primary modern scope artifacts are PRD + Product Backlog.

---

## 1. Executive Summary

### Problem Statement
The kiosk needs a simple POS to register sales, manage stock, and understand profitability, operated by a 60+ user with low technical experience. The current process is manual and does not scale for inventory and business control.

### Business Objective
Deliver a UI-first MVP to validate usability early, while designing stable Next.js API contracts aligned with the defined hexagonal architecture. The system must also support customer debt tracking for on-account sales.

### Success Metrics (KPIs)
- Average sale time: <= 20 seconds for simple checkout with loaded catalog.
- Average product onboarding time: <= 90 seconds in guided mode.
- Daily stock accuracy: >= 95% in pilot.
- Guided demo task success: >= 80% without assistance.
- On-account traceability: 100% of on-account sales linked to customer and order.

---

## 2. Scope Definition

### In Scope
- Functional POS UI mockup with large cards and touch-friendly controls.
- POS UI implementation aligned with user-approved visual reference (layout and visual hierarchy).
- Vertical-slice delivery for every FR/UC with mandatory integrated evidence (`UI + API + domain/application + tests`).
- Sales registration with v1 payment methods: `cash` and `on_account` (no gateway in MVP).
- Product, category, stock, and stock movement management with mandatory cost capture on inbound stock.
- Bulk price update for product batches (percentage or fixed amount), with preview before apply.
- Sales history and baseline analytics.
- Offline mode for critical MVP operations with automatic sync on reconnection.
- API contract design in Next.js for current web and future mobile app.
- Guided product onboarding for non-technical users.
- Product image strategy without requiring original product photos.
- Customer debt tracking:
  - set checkout as `on_account`
  - require customer selection/creation
  - accumulate debt by customer and order
  - register payments that reduce outstanding balance

### Out of Scope
- Real MercadoPago transaction processing in MVP.
- External accounting/tax integrations.
- Enterprise-level multi-branch/multi-tenant capabilities.
- Automated debt collection workflow.
- Ticket/receipt printing in MVP.

### Assumptions
- First rollout is single-kiosk operation.
- Primary operation device for week 1 is a tablet.
- Initial catalog setup support will be provided.
- Internet connectivity can be intermittent; offline fallback is required.
- Payment methods in v1 are limited to `cash` and `on_account`.

### Constraints
- Main operator has low digital literacy.
- MVP UX is optimized tablet-first.
- Delivery should prioritize visual validation and core operation.
- Initial phase avoids unnecessary business rule complexity.
- FR/UC scope cannot close as backend-only; each must be executable from an assigned UI surface.

### Dependencies
- [x] Define primary operation device (desktop/tablet/mobile) - Decision: `tablet`
- [x] Define scanner scope - Decision: `phase_2_post_mvp`
- [x] Define receipt printing in MVP - Decision: `not_required`
- [x] Store approved UI reference asset/path in repository docs - `workflow-manager/docs/planning/005-ui-reference-pos-v1-draft.md`
- [x] Define product image sources/placeholders - Status: `implemented` via deterministic category placeholders in catalog module
- [x] Define baseline profit rules and costing method - Decision: `weighted_average`
- [x] Define customer debt credit-limit policy - Decision: `no_configurable_limit_in_mvp`

---

## 3. Stakeholders and Users

### Stakeholders
- **Kiosk owner**: needs simple, fast, reliable operation.
- **Developer/implementer**: needs maintainable architecture and scalable API.
- **Daily cashier/operator**: needs low-friction sales and stock flow.

### Personas / User Roles
- **Primary operator (60+)**: complete sales quickly with minimal reading.
- **Support administrator**: manage products, stock, reports, and customer debts.
- **Future mobile client**: consume API for scanning in sales and stock operations.

---

## 4. Functional Requirements (FR)

| ID | Requirement | Priority | Source | Acceptance Summary |
| --- | --- | --- | --- | --- |
| FR-001 | Register sale with visual product selection | high | Owner / UC-001 | Sale can be built and edited without keyboard |
| FR-002 | Select payment method at checkout (`cash`, `on_account` in v1) | high | Owner / UC-001 | Every sale stores payment method from the allowed set |
| FR-003 | Manage product catalog (create/edit/soft-disable) with category, price, cost, stock | high | Admin / UC-002 | Product is sale-ready after onboarding |
| FR-004 | Register stock movements (inbound/outbound/adjustment) with mandatory unit cost on inbound | high | Admin / UC-003 | Inbound stock cannot be confirmed without unit cost; stock updates are traceable |
| FR-005 | Query sales history by date and payment method | medium | Owner / UC-004 | List and details available |
| FR-006 | Show baseline analytics (top products, revenue, cost-based estimated profit) | medium | Owner / UC-004 | Daily/weekly KPI visibility with explicit cost basis |
| FR-007 | Expose versioned REST API for products, sales, stock, reports | high | Architecture / UC-005 | Stable contracts for web/mobile |
| FR-008 | Provide guided product onboarding for non-technical users | high | Owner / UC-002 | Wizard reduces onboarding errors/time |
| FR-009 | Support products without real photos using placeholders | high | Owner / UC-002 | Product creation is never blocked by missing photo |
| FR-010 | Run MVP in mock mode for UI demo and early validation | high | Implementer / UC-006 | End-to-end UI demo without production backend |
| FR-011 | Support `on_account` checkout linked to customer | high | Owner / UC-007 | On-account sale cannot be confirmed without customer |
| FR-012 | Accumulate customer debt by originating orders | high | Owner / UC-007 | Debt ledger stores debt entries per order |
| FR-013 | Register debt payments to reduce customer outstanding balance | high | Owner / UC-007 | Payment records reduce debt consistently |
| FR-014 | Allow offline operation for critical MVP flows with later synchronization | high | Owner / UC-008 | Sale/debt events can be captured offline and synced without loss |
| FR-015 | Execute bulk price updates for product batches | high | Owner / UC-009 | Admin can apply percentage/fixed updates to selected products with preview and audit trail |

---

## 5. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Target/Threshold | Validation Method |
| --- | --- | --- | --- | --- |
| NFR-001 | performance | POS UI responds immediately in common hardware | Key actions <= 200ms perceived | Playwright + Lighthouse + manual check |
| NFR-002 | usability | UI suitable for low-technical 60+ user | Touch targets >= 44px; text >= 18px; <= 3 checkout steps | Guided usability session |
| NFR-003 | reliability | No loss of confirmed sales/stock/debt events | 0 critical data-loss cases in E2E/smoke | Playwright E2E + logs |
| NFR-004 | maintainability | API/domain follows Hexagonal Architecture | 100% new logic through use-cases and ports | Architecture review + tests |
| NFR-005 | portability | Useful UX on desktop and mobile | Functional at 360px and >= 1280px | Responsive checks + E2E |
| NFR-006 | auditability | Debt events must be auditable per order/payment | Immutable ledger entries with timestamps/user | Integration tests |
| NFR-007 | offline-resilience | Critical operations survive internet loss | Offline queue persists and sync completes after reconnection | E2E offline scenarios + integration tests |

---

## 6. Use Cases - High Level

| UC ID | Name | Primary Actor | Trigger | Expected Result | Related FR | Primary UI Surface |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | Register point-of-sale checkout | Primary operator | Customer purchase | Sale stored with totals and payment method | FR-001, FR-002 | POS screen (catalog, cart, checkout order panel) |
| UC-002 | Guided product onboarding | Support admin | New product onboarding | Product activated with minimum data and image policy | FR-003, FR-008, FR-009 | Guided onboarding wizard |
| UC-003 | Register stock movement | Support admin | Restock/adjustment | Stock updates with movement traceability and inbound cost registration | FR-004 | Stock movement form/screen |
| UC-004 | Review history and analytics | Kiosk owner | Daily/weekly review | Decision support metrics available | FR-005, FR-006 | Sales history + analytics dashboard |
| UC-005 | Consume API from web/mobile | Frontend/mobile client | Any operation | Channel-agnostic operation through stable contracts | FR-007 | Module UIs consuming `/api/v1/*` contracts |
| UC-006 | Run UI-first mock demo | Implementer | Demo or E2E execution | Full flow without production backend | FR-010 | Existing module UIs running in mock mode |
| UC-007 | Manage customer debt from on-account sales | Owner/Admin | On-account checkout or debt payment | Debt accrues by order and can be reduced by payments | FR-011, FR-012, FR-013 | Checkout customer selector + debt ledger/payment screen |
| UC-008 | Operate critical flows in offline mode | Primary operator / Admin | Internet connection lost | Sale and debt events are captured and synchronized later | FR-014 | Offline queue/sync status UI |
| UC-009 | Execute bulk price update for product batches | Support admin / owner | Supplier or inflation price change | Selected products receive consistent price update with traceability | FR-015 | Bulk price update screen |

### 6.1 Delivery Rule for All Use Cases
- Each UC is considered complete only with linked implementation evidence for:
  - `UI` surface execution (screen/panel/modal is operable),
  - `API` contract invocation (`/api/v1/...`),
  - `Domain/Application` rule enforcement via use cases/services,
  - `Tests` (unit/integration/E2E) for happy path and key failure path.
- If a technical item has no standalone UI (for example architecture guardrails), it must explicitly reference which existing UIs are being protected/validated.

---

## 7. Use Cases - Detailed

Delivery note: each detailed UC below inherits the mandatory integrated-slice evidence defined in section `6.1`.

### UC-001 - Register point-of-sale checkout
- **Goal**: complete checkout in very few steps with low cognitive load.
- **Primary Actor**: primary operator.
- **Preconditions**:
  - Catalog is loaded and visible.
  - POS session is open.
- **Trigger**: customer requests a purchase.
- **Main Flow**:
  1. Operator selects products from visual categories.
  2. Operator adjusts quantities in cart.
  3. System calculates subtotal and total.
  4. Operator selects payment method.
  5. System confirms sale and deducts stock.
- **Alternative Flows**:
  1. Remove item before confirmation.
  2. Change payment method before confirmation.
  3. If app is offline, sale is saved as `pending_sync`.
- **Exception Flows**:
  1. Out-of-stock product cannot be added.
  2. Persistence error cancels confirmation and asks for retry.
  3. If offline queue persistence fails, system blocks confirmation and displays recovery instructions.
- **Business Rules**:
  - BR-001
  - BR-002
  - BR-003
  - BR-011
  - BR-013
- **Data Inputs/Outputs**:
  - Input: selected products, quantities, payment method.
  - Output: persisted sale, stock update, simple receipt summary.
- **Postconditions**:
  - Sale available in history.
  - Stock movement events recorded.
- **Acceptance Criteria (BDD)**:
  - [ ] **Given** a valid cart, **When** checkout is confirmed, **Then** sale is stored with total and payment method.
  - [ ] **Given** an out-of-stock item, **When** operator tries to add it, **Then** action is blocked with clear feedback.

### UC-002 - Guided product onboarding
- **Goal**: allow fast onboarding with minimal errors for non-technical users.
- **Primary Actor**: support admin.
- **Preconditions**:
  - User has catalog permissions.
  - Core categories are preloaded.
- **Trigger**: new product needs to be onboarded.
- **Main Flow**:
  1. User opens onboarding wizard and picks mode: manual, CSV, scanner (future).
  2. System requests minimum fields: name, category, price, optional cost, initial stock.
  3. System suggests category placeholder if no photo is provided.
  4. User confirms and system publishes product.
- **Alternative Flows**:
  1. CSV import with preview and column validation.
  2. Scanner-assisted onboarding in later phase.
- **Exception Flows**:
  1. Duplicate SKU is blocked with merge/new-code suggestion.
  2. Invalid fields are highlighted with simple messages.
- **Business Rules**:
  - BR-004
  - BR-005
- **Data Inputs/Outputs**:
  - Input: minimum product data + optional image.
  - Output: active product available in POS.
- **Postconditions**:
  - Product is visible in POS.
  - Catalog history event is stored.
- **Acceptance Criteria (BDD)**:
  - [ ] **Given** a low-technical user, **When** they use guided manual mode, **Then** they can create a complete product in <= 90 seconds.
  - [ ] **Given** no photo was uploaded, **When** the product is saved, **Then** a valid placeholder is assigned automatically.

### UC-003 - Register stock movement with cost basis
- **Goal**: keep inventory and profit baseline reliable by capturing inbound stock cost.
- **Primary Actor**: support admin.
- **Preconditions**:
  - Product exists and is active.
  - User has stock management permissions.
- **Trigger**: restock, stock correction, or stock output is required.
- **Main Flow**:
  1. User selects product and movement type (`inbound`, `outbound`, `adjustment`).
  2. User enters quantity.
  3. If movement is `inbound`, system requires unit cost input.
  4. User confirms movement.
  5. System stores movement event and recalculates available stock and weighted-average cost basis for reporting.
- **Alternative Flows**:
  1. `outbound` movement skips cost input.
  2. `adjustment` movement stores reason code for audit.
- **Exception Flows**:
  1. Missing unit cost on `inbound` blocks confirmation.
  2. Invalid numeric values (quantity/cost <= 0) are rejected with clear message.
- **Business Rules**:
  - BR-003
  - BR-006
- **Data Inputs/Outputs**:
  - Input: product ID, movement type, quantity, unit cost (for inbound), reason.
  - Output: stock movement event, updated stock balance, updated profit cost basis.
- **Postconditions**:
  - Stock remains auditable by movement history.
  - Profit calculation has updated cost data when stock is replenished.
- **Acceptance Criteria (BDD)**:
- [ ] **Given** movement type `inbound`, **When** unit cost is missing, **Then** movement cannot be confirmed.
- [ ] **Given** valid inbound movement with quantity and cost, **When** movement is saved, **Then** stock and cost basis are updated atomically.

### UC-009 - Bulk price update for product batches
- **Goal**: update many product prices quickly when market prices change.
- **Primary Actor**: support admin/owner.
- **Preconditions**:
  - User has catalog price-management permissions.
  - At least one product matches selected filter/scope.
- **Trigger**: supplier list or inflation change requires mass repricing.
- **Main Flow**:
  1. User opens bulk price update screen.
  2. User selects scope (all products, category, brand, or filtered set).
  3. User selects update mode (`percentage` or `fixed_amount`) and value.
  4. System calculates and displays preview (old price vs new price).
  5. User confirms update.
  6. System applies prices atomically and stores audit record for the batch.
- **Alternative Flows**:
  1. User excludes specific SKUs from selected scope before confirmation.
  2. User saves preview and aborts apply.
- **Exception Flows**:
  1. Calculated price <= 0 for any product blocks confirmation.
  2. Concurrent conflicting update aborts batch and returns retry instructions.
- **Business Rules**:
  - BR-014
- **Data Inputs/Outputs**:
  - Input: scope/filter, update mode, update value, optional exclusions.
  - Output: batch update summary with total updated products and per-product change list.
- **Postconditions**:
  - Updated prices are visible in POS/catalog.
  - Price update audit event is recorded with author/timestamp.
- **Acceptance Criteria (BDD)**:
  - [ ] **Given** a category scope and `+10%`, **When** admin confirms bulk update, **Then** all selected products are updated and preview-matched.
  - [ ] **Given** at least one resulting invalid price, **When** admin tries to confirm, **Then** batch update is blocked with explicit validation message.

### UC-006 - UI-first mock demo
- **Goal**: validate UX and end-to-end flow before final backend exists.
- **Primary Actor**: implementer.
- **Preconditions**:
  - App runs in mock mode.
  - Fixtures are loaded.
- **Trigger**: customer demo or E2E run.
- **Main Flow**:
  1. System initializes mock adapters/mock server.
  2. Operator runs sale/onboarding/report flows.
  3. Playwright validates expected UI behavior.
- **Alternative Flows**:
  1. Contract-mode validates mock responses against schemas.
  2. Real-mode swaps adapter to real infrastructure without UI rewrite.
- **Exception Flows**:
  1. Inconsistent fixtures fail tests with contract error.
  2. Missing mock endpoint surfaces API gap.
- **Business Rules**:
  - BR-007
- **Data Inputs/Outputs**:
  - Input: JSON fixtures + user actions.
  - Output: E2E evidence and feedback.
- **Postconditions**:
  - UX/API gaps are found early.
  - Base is ready for mock-to-real transition.
- **Acceptance Criteria (BDD)**:
  - [ ] **Given** mock mode is enabled, **When** MVP E2E runs, **Then** critical flows pass without real backend dependencies.
  - [ ] **Given** API contracts evolve, **When** fixtures are outdated, **Then** tests detect incompatibilities.

### UC-007 - Customer debt management
- **Goal**: track and reduce customer debt for on-account sales.
- **Primary Actor**: owner/support admin.
- **Preconditions**:
  - Customer profile exists or can be created.
  - On-account payment method is enabled.
- **Trigger**: checkout marked as `on_account` or debt payment received.
- **Main Flow (On-Account Checkout)**:
  1. Operator marks payment method as `on_account`.
  2. System requires customer selection or creation.
  3. System confirms sale.
  4. System creates debt ledger entry linked to customer and order.
- **Main Flow (Debt Payment Registration)**:
  1. Admin opens customer debt ledger.
  2. Admin registers payment amount and payment method.
  3. System creates debt payment ledger event.
  4. System recalculates and stores updated outstanding balance.
- **Alternative Flows**:
  1. Partial payment reduces but does not close debt.
  2. Full payment clears outstanding balance.
- **Exception Flows**:
  1. Customer not selected in on-account checkout blocks confirmation.
  2. Payment amount greater than outstanding debt is blocked or requires explicit overpayment policy.
- **Business Rules**:
  - BR-008
  - BR-009
  - BR-010
  - BR-012
- **Data Inputs/Outputs**:
  - Input: customer ID, order ID, debt payment amount.
  - Output: updated debt ledger and outstanding balance.
- **Postconditions**:
  - Debt state is traceable by customer and order.
  - Debt balance reflects registered payments.
- **Acceptance Criteria (BDD)**:
  - [ ] **Given** checkout is `on_account`, **When** no customer is selected, **Then** checkout cannot be confirmed.
  - [ ] **Given** a customer with outstanding debt, **When** a payment is registered, **Then** outstanding balance is reduced by payment amount.

### UC-008 - Offline operation and synchronization
- **Goal**: keep sales and debt capture operating during internet outages.
- **Primary Actor**: primary operator/support admin.
- **Preconditions**:
  - User is authenticated.
  - Local persistence is available.
- **Trigger**: connection is lost during operation.
- **Main Flow**:
  1. System detects offline status.
  2. User performs checkout (`cash` or `on_account`) or registers debt payment.
  3. System stores event locally as `pending_sync`.
  4. Connection is restored.
  5. System synchronizes queued events to backend and marks them `synced`.
- **Alternative Flows**:
  1. Manual sync retry is executed by admin.
  2. Partial sync succeeds and failed items remain in retry queue.
- **Exception Flows**:
  1. Conflict on sync requires resolution rule and logs audit event.
  2. Local persistence unavailable blocks new offline confirmations.
- **Business Rules**:
  - BR-013
- **Data Inputs/Outputs**:
  - Input: offline sale/debt events.
  - Output: synchronized server records and sync status trail.
- **Postconditions**:
  - No confirmed offline event is lost.
  - Pending queue is empty after successful synchronization.
- **Acceptance Criteria (BDD)**:
  - [ ] **Given** internet is unavailable, **When** operator confirms checkout, **Then** event is saved locally as `pending_sync`.
  - [ ] **Given** pending events exist, **When** connectivity returns, **Then** events are synchronized and marked `synced`.

---

## 8. Business Rules and Policies

| ID | Rule | Rationale | Related FR/UC |
| --- | --- | --- | --- |
| BR-001 | A sale cannot be confirmed with an empty cart | Prevent invalid records | FR-001, UC-001 |
| BR-002 | Payment method is mandatory at checkout | Cash register traceability | FR-002, UC-001 |
| BR-003 | Stock cannot become negative by default policy | Inventory integrity | FR-004, UC-001, UC-003 |
| BR-004 | Every product requires minimum data (name, category, price) | Catalog quality | FR-003, FR-008, UC-002 |
| BR-005 | Missing real image triggers category placeholder | Avoid onboarding block by photos | FR-009, UC-002 |
| BR-006 | Inbound stock movement requires unit cost; profit uses persisted weighted-average inventory cost basis | Profit reliability and traceability | FR-004, FR-006, UC-003, UC-004 |
| BR-007 | Mock mode is for validation only; production release requires real-backend E2E | Reduce false confidence risk | FR-010, UC-006 |
| BR-008 | On-account checkout requires customer assignment | Debt ownership traceability | FR-011, UC-007 |
| BR-009 | Debt ledger entries are recorded per originating order | Auditability and reconciliation | FR-012, UC-007 |
| BR-010 | Debt payments reduce outstanding balance and must be logged immutably | Financial correctness and traceability | FR-013, UC-007 |
| BR-011 | Allowed payment methods in v1 are only `cash` and `on_account` | Scope control and UI simplicity | FR-002, UC-001 |
| BR-012 | MVP has no configurable debt credit limit per customer | Keep financial policy simple in MVP | FR-011, UC-007 |
| BR-013 | Offline-confirmed critical events must be queued and synchronized with audit trace | Reliability under connectivity issues | FR-014, UC-001, UC-007, UC-008 |
| BR-014 | Bulk price updates must support preview and apply atomically with per-product audit trail | Prevent inconsistent repricing and enable rollback analysis | FR-015, UC-009 |

---

## 9. Data and Integrations (High Level)

### Data Entities
- Product
- Category
- InventoryItem
- StockMovement
- Sale
- SaleLine
- PaymentMethod
- User
- ProductImage
- Customer
- CustomerDebtLedgerEntry
- DebtPayment
- PriceUpdateBatch

### External Integrations
- MercadoPago (future): online payment processing and reconciliation.
- Supabase/PostgreSQL: persistence for catalog, sales, stock, customers, and debt.
- Storage (Supabase bucket or equivalent): product images and placeholders.
- Barcode scanner (keyboard wedge): phase 2 for faster sales and stock operations.

---

## 10. Risks and Open Questions

### Risks
- **R-001**: low adoption due to complex UI - Mitigation: visual-first interface, large controls, fast iteration cycles.
- **R-002**: slow/error-prone initial product onboarding - Mitigation: onboarding wizard, CSV import, guided setup.
- **R-003**: no real product photos - Mitigation: category placeholders and generic assets.
- **R-004**: desktop/mobile UX differences outside tablet target - Mitigation: implement tablet-first MVP and validate responsive adaptations in later iterations.
- **R-005**: debt assigned to wrong customer - Mitigation: mandatory confirmation and customer validation at checkout.
- **R-006**: offline sync conflicts create duplicate/inconsistent records - Mitigation: idempotency keys + conflict logging and retry policy.

### Open Questions / Decisions
- [x] Q-001: Primary operation device for week 1 is `tablet`.
- [x] Q-002: Receipt printing required in MVP? `No`.
- [x] Q-003: Offline mode required in MVP? `Yes`.
- [x] Q-004: Payment methods required in v1? `cash`, `on_account`.
- [x] Q-005: Scanner in MVP or later phase? `Phase 2`.
- [x] Q-006: Configurable debt credit limit per customer? `No` (manual policy in MVP).
- [x] Q-007: Inventory costing policy for profit is `weighted_average`.

---

## 11. Traceability Matrix

| Item Type | ID | Mapped To | Verification |
| --- | --- | --- | --- |
| FR | FR-001 | UC-001, BR-001 | UI interaction tests + API contract + E2E |
| FR | FR-003 | UC-002, BR-004 | UI wizard tests + API contract + E2E |
| FR | FR-004 | UC-003, BR-003, BR-006 | UI flow + API + integration + E2E |
| FR | FR-009 | UC-002, BR-005 | UI placeholder rendering + E2E |
| FR | FR-010 | UC-006, BR-007 | Mock-mode cross-screen E2E + contract checks |
| FR | FR-011 | UC-007, BR-008 | Checkout UI validation + API + E2E |
| FR | FR-012 | UC-007, BR-009 | Debt ledger UI + integration + E2E |
| FR | FR-013 | UC-007, BR-010 | Debt payment UI + integration + E2E |
| FR | FR-014 | UC-008, BR-013 | Offline status UI + offline E2E + sync integration |
| FR | FR-015 | UC-009, BR-014 | Bulk update UI + API + integration + E2E |
| NFR | NFR-001 | UC-001 | UI performance test |
| NFR | NFR-002 | UC-001, UC-002 | Usability session + UI checklist |
| NFR | NFR-005 | UC-001 | Responsive UI E2E |
| NFR | NFR-006 | UC-007 | Ledger UI audit evidence + integration tests |
| NFR | NFR-007 | UC-008 | Offline UI E2E + sync integration |
| BR | BR-003 | FR-004, UC-001, UC-003 | Domain/application unit tests |
| BR | BR-006 | FR-004, FR-006, UC-003, UC-004 | Domain/application unit tests + reporting integration tests |
| BR | BR-011 | FR-002, UC-001 | API contract + UI tests |
| BR | BR-013 | FR-014, UC-001, UC-007, UC-008 | Offline integration + E2E |
| BR | BR-014 | FR-015, UC-009 | Catalog application unit + integration tests |

---

## 12. Approval Checklist

- [x] Scope approved by business owner
- [x] Functional requirements validated
- [ ] Non-functional requirements validated
- [x] High-level use cases reviewed
- [x] Detailed use cases reviewed
- [x] Traceability matrix completed
- [x] Risks accepted or mitigated
- [x] Ready to create planning document

### Sign-off
- **Business Owner**: `{name}` - `{date}`
- **Product Owner**: `{name}` - `{date}`
- **Tech Lead / Architect**: `{name}` - `{date}`

---

## 13. Planning Handoff (Next Step)

After approval, break this document into execution artifacts:
- `Epic` doc (if needed)
- `Feature` docs
- `Task` docs with atomic acceptance criteria
- Test plan aligned with FR/NFR/UC traceability

Suggested first breakdown:
- Feature A: `ui-pos-mockup-and-navigation`
- Feature B: `api-contracts-v1-products-sales-stock`
- Feature C: `guided-product-onboarding-images-and-bulk-price-update`
- Feature D: `sales-history-and-basic-analytics`
- Feature E: `customer-debt-on-account-and-payments`
- Feature F: `offline-sales-and-debt-sync`
