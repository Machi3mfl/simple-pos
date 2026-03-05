# PRD: simple-pos

## Document Metadata

**Document ID**: `002`  
**File Name**: `002-prd-simple-pos-draft.md`  
**Status**: `approved`  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.7`  
**Created At**: `2026-02-27`  
**Last Updated**: `2026-03-01`  
**Linked Backlog**: `workflow-manager/docs/planning/003-backlog-simple-pos-draft.md`  
**Linked Design**: `workflow-manager/docs/planning/005-ui-reference-pos-v1-draft.md`

---

## 1. Product Context

### Problem Statement
The kiosk needs a simple POS to register sales, manage inventory, and understand profitability. The main operator is a 60+ user with low technical experience.

### Target Users
- Primary operator (60+), focused on speed and simplicity.
- Support admin (catalog setup, stock adjustments, reporting, customer debt tracking).

### Why Now
We need to validate usability quickly with a functional UI demo to build customer confidence and reduce delivery risk before full business logic is implemented.

---

## 2. Goals and Non-Goals

### Goals
- Validate sale checkout usability with a low-friction visual UI.
- Cover MVP operations: sales, catalog, stock, history, basic analytics.
- Ensure profit baseline is reliable through inbound stock cost capture with weighted-average costing.
- Support fast bulk price updates for batches of products (critical for frequent market price changes).
- Support customer debt flow: on-account sales, debt accumulation by customer/order, debt payment registration.
- Support offline operation for critical flows with controlled synchronization.
- Define versioned API contracts for web now and mobile later.

### Non-Goals
- Real MercadoPago payment processing in MVP.
- Advanced analytics and demand prediction.
- Multi-branch or enterprise-level multi-tenant capabilities.

### Success Metrics
| Metric | Target | Measurement Window | Owner |
| --- | --- | --- | --- |
| Average sale completion time | <= 20s for simple sale | first 2 pilot weeks | Product Owner |
| Average product onboarding time | <= 90s (guided mode) | first 2 pilot weeks | Product Owner |
| Daily stock accuracy | >= 95% | first 2 pilot weeks | Operations |
| Assisted-task completion | >= 80% without help in guided demo | first 3 demos | Product Owner |
| On-account sales traceability | 100% linked to a customer and order | first 2 pilot weeks | Operations |

---

## 3. Scope

### In Scope (MVP)
- Functional POS mockup UI (desktop + mobile responsive) with large touch targets.
- Functional POS mockup UI must follow the approved visual reference selected by the user.
- Sale registration with v1 payment methods: `cash` and `on_account`.
- Product catalog management (create/edit/soft-disable) and base stock control with mandatory unit cost on inbound stock.
- Bulk price update for batches of products (percentage/fixed amount/set price) with preview and audit.
- Sales history and basic analytics (top products, revenue, baseline profit).
- Customer debt management:
  - mark checkout as `on_account`
  - select or register customer at checkout
  - accumulate debt by customer and order
  - register debt payments and update outstanding balance
- Next.js API v1 contracts for products, sales, stock, reporting, customers, and debt.
- Offline capture + synchronization for checkout and debt events.
- Guided onboarding strategy for non-technical users.
- Product image strategy without requiring real product photos.

### Out of Scope (MVP)
- Real payment gateway transactions (MercadoPago processing).
- Accounting/tax integrations.
- Enterprise capabilities (advanced permissions, multi-tenant, multi-branch).
- Automated debt collection workflows (notifications, dunning, legal collections).
- Ticket/receipt printing.

### Assumptions
- Initial deployment is a single kiosk operation.
- Primary operation device in week 1 is a tablet.
- Initial catalog onboarding support will be provided.
- Internet connectivity can be intermittent; offline fallback is required.

### Constraints
- Primary operator has low digital literacy.
- MVP UX is optimized tablet-first.
- Demo must work before final backend is fully implemented.

---

## 4. User Experience and Flows

### UX Principles
- Touch-first interaction: large controls, short flows, clear feedback.
- Low cognitive load: simple language, obvious actions, guided errors.
- High readability: clear typography hierarchy and strong contrast.

### Primary User Journeys (High Level)
| Journey ID | Name | Actor | Trigger | Expected Outcome |
| --- | --- | --- | --- | --- |
| J-001 | Register sale | Primary operator | Customer wants to buy | Sale confirmed, payment method stored, stock updated |
| J-002 | Guided product onboarding | Support admin | New product needs to be added | Product available for sale without friction |
| J-003 | Stock adjustment | Support admin | Restock/waste/manual correction | Stock remains traceable and consistent |
| J-004 | Sales history and analytics | Kiosk owner | Daily/weekly review | Business decisions based on baseline metrics |
| J-005 | Customer debt and payment management | Support admin / owner | On-account checkout or debt payment | Debt is tracked per customer and reduced by payments |
| J-006 | Offline capture and synchronization | Primary operator / support admin | Internet outage | Critical operations continue and synchronize later |
| J-007 | Bulk product repricing | Support admin / owner | Supplier/inflation price change | Catalog prices are updated consistently in one operation |

### Key Screens / States
- POS screen (categories + product grid + cart).
- Checkout confirmation (payment method and total).
- Guided product onboarding (manual/CSV/scanner later).
- Sales history and basic reports.
- Customer selection/registration in checkout for on-account sales.
- Customer debt ledger and debt payment registration screen.
- Bulk price update screen with preview and confirmation.
- Offline queue/sync status screen.
- Empty/error states with actionable messages.

---

## 5. Requirements

### Functional Requirements (FR)
| ID | Requirement | Priority | Acceptance Summary | Journey |
| --- | --- | --- | --- | --- |
| FR-001 | Register sale through visual product selection | high | Sale can be built and edited without keyboard | J-001 |
| FR-002 | Select payment method at checkout (`cash`, `on_account` in v1) | high | Checkout cannot complete without payment method from the allowed set | J-001 |
| FR-003 | Manage catalog (create/edit/soft-disable) | high | Product is available in POS after creation | J-002 |
| FR-004 | Register stock movements with mandatory inbound unit cost | high | Inbound movements require cost; stock updates remain traceable | J-003 |
| FR-005 | Query sales history | medium | Filter by date and payment method | J-004 |
| FR-006 | Show baseline business analytics | medium | Top-selling products + revenue + cost-based baseline profit | J-004 |
| FR-007 | Expose versioned API v1 | high | Stable contracts for web/mobile clients | J-001, J-002, J-003, J-004, J-005 |
| FR-008 | Provide guided onboarding for non-technical users | high | Guided flow with field-level validations | J-002 |
| FR-009 | Support category placeholders when no product photo exists | high | Product can be saved and shown without real photo | J-002 |
| FR-010 | Support mock mode for UI-first demos and E2E | high | Critical flows run without final backend | J-001, J-002 |
| FR-011 | Allow checkout as `on_account` linked to a customer | high | On-account sale requires customer selection or creation | J-005 |
| FR-012 | Maintain customer debt ledger accumulated by order | high | Outstanding balance is computed from unpaid order debt entries | J-005 |
| FR-013 | Register customer debt payments and reduce balance | high | Payment record updates outstanding debt correctly | J-005 |
| FR-014 | Capture and sync critical operations in offline mode | high | Sale/debt events persist offline and sync when connection returns | J-006 |
| FR-015 | Execute bulk price updates for product batches | high | Admin can preview and apply percentage/fixed amount/set-price updates with auditability | J-007 |

### Non-Functional Requirements (NFR)
| ID | Category | Requirement | Target/Threshold | Validation |
| --- | --- | --- | --- | --- |
| NFR-001 | performance | Fluid interaction in key actions | <= 200ms perceived response | Playwright + Lighthouse |
| NFR-002 | usability | UI suitable for low-technical users | Targets >= 44px, <= 3 steps for checkout | guided usability sessions |
| NFR-003 | reliability | No loss of confirmed sales/stock/debt movements | 0 critical data-loss cases in E2E | E2E + logs |
| NFR-004 | maintainability | Hexagonal architecture boundaries enforced | new logic through use-cases/ports | architecture review + tests |
| NFR-005 | portability | Effective desktop and mobile usage | functional at 360px and >= 1280px | responsive E2E |
| NFR-006 | auditability | Debt changes must be traceable by order/payment event | debt ledger entries are immutable and attributable | API + integration tests |
| NFR-007 | offline-resilience | Critical operations must tolerate connectivity loss | Offline queue persists and synchronizes after reconnect | offline E2E + sync integration |

---

## 6. API and Domain Boundaries

### Domain Modules (Hexagonal)
- `catalog` (products, categories, product images).
- `sales` (sale, sale lines, payment method).
- `inventory` (stock item, stock movements).
- `reporting` (top products, income summary, profit summary).
- `customers` (customer profile and lookup).
- `accounts-receivable` (on-account debt entries and debt payments).

### API Contract Overview
| Endpoint/Action | Method | Purpose | Request DTO | Response DTO |
| --- | --- | --- | --- | --- |
| `/api/v1/products` | GET | List products | query filters | `ProductListResponse` |
| `/api/v1/products` | POST | Create product | `CreateProductDTO` | `ProductResponse` |
| `/api/v1/sales` | POST | Register sale | `CreateSaleDTO` | `SaleResponse` |
| `/api/v1/stock-movements` | POST | Register stock movement | `CreateStockMovementDTO` (`unitCost` required for `inbound`) | `StockMovementResponse` |
| `/api/v1/reports/top-products` | GET | Top-selling products | query period | `TopProductsResponse` |
| `/api/v1/reports/profit-summary` | GET | Revenue/cost/profit summary | query period | `ProfitSummaryResponse` |
| `/api/v1/customers` | POST | Create customer | `CreateCustomerDTO` | `CustomerResponse` |
| `/api/v1/customers/{id}/debt` | GET | Get customer debt summary and ledger | query period | `CustomerDebtSummaryResponse` |
| `/api/v1/debt-payments` | POST | Register debt payment | `CreateDebtPaymentDTO` | `DebtPaymentResponse` |
| `/api/v1/products/price-batches` | POST | Apply bulk price updates for product scope | `BulkPriceUpdateDTO` | `BulkPriceUpdateResponse` |
| `/api/v1/sync/events` | POST | Synchronize offline queued events | `SyncEventsBatchDTO` | `SyncEventsResultDTO` |

### External Integrations
- MercadoPago: `phase_2_post_mvp`.
- Barcode scanner (keyboard wedge): `phase_2_post_mvp`.
- Supabase/PostgreSQL + storage: `phase_1_mvp_real_persistence`.

---

## 7. Release Strategy

### Phase Plan
- **Phase 0 (UI Mock + Contracts)**: navigable UI, mock data, contract-first endpoints.
- **Phase 1 (MVP Real Persistence + Offline)**: real persistence for catalog, sales, stock, customers, debt, and offline synchronization.
- **Phase 2 (Post-MVP Enhancements)**: scanner, MercadoPago, advanced analytics.

### Go/No-Go Criteria for MVP
- [x] Critical sales/stock/debt flows validated with real user demo.
- [x] Mock-mode E2E green for J-001, J-002, and J-005.
- [x] Real-backend E2E green for sale, stock, and debt before production release.
- [x] Offline outage/recovery scenarios green for J-006.
- [x] NFR usability/performance/reliability thresholds met.

Evidence reference:
- `workflow-manager/docs/planning/008-nfr-validation-evidence-ready.md`

---

## 8. Risks and Open Questions

### Risks
- **R-001**: low adoption due to UI complexity - Mitigation: early UI iteration with real operator feedback.
- **R-002**: catalog setup errors in first load - Mitigation: guided wizard + CSV + onboarding assistance.
- **R-003**: lack of real product photos - Mitigation: category-based placeholders.
- **R-004**: desktop/mobile mismatch outside tablet target - Mitigation: tablet-first MVP plus responsive adaptation backlog.
- **R-005**: wrong debt assignment to customer - Mitigation: required customer confirmation before on-account checkout.
- **R-006**: incorrect stock cost entry distorts profit - Mitigation: mandatory cost validation + clear audit trail + correction flow.
- **R-007**: offline sync conflicts create duplicate/inconsistent records - Mitigation: idempotency keys + conflict logging and retry policy.

### Open Questions / Decisions
- [x] Q-001: primary operation device in week 1 is `tablet`.
- [x] Q-002: ticket printing required in MVP? `No`.
- [x] Q-003: offline mode required for MVP? `Yes`.
- [x] Q-004: payment methods in v1? `cash`, `on_account`.
- [x] Q-005: scanner in MVP or phase 2? `Phase 2`.
- [x] Q-006: configurable customer debt credit limit? `No`.
- [x] Q-007: inventory costing policy for profit is `weighted_average`.

---

## 9. Traceability and Handoff

### Traceability
| PRD Item | Backlog Item(s) | Test Type |
| --- | --- | --- |
| FR-001 | PBI-001, PBI-002 | component/e2e |
| FR-003 | PBI-006, PBI-007 | api/e2e |
| FR-004 | PBI-009 | api/integration/e2e |
| FR-006 | PBI-012 | reporting/integration |
| FR-010 | PBI-003, PBI-004 | e2e mock |
| FR-011 | PBI-014 | api/e2e |
| FR-012 | PBI-015 | integration/e2e |
| FR-013 | PBI-016 | integration/e2e |
| FR-014 | PBI-017, PBI-018 | offline e2e/integration |
| FR-015 | PBI-019 | api/integration/e2e |
| NFR-002 | PBI-005, PBI-006 | usability/e2e |
| NFR-004 | PBI-010 | architecture review |
| NFR-006 | PBI-015, PBI-016 | integration tests |
| NFR-007 | PBI-017, PBI-018 | offline reliability tests |

### Planning Handoff
- Map each FR/NFR to one or more PBIs.
- Derive Features from coherent PBI groups.
- Derive atomic Tasks from each Feature.

---

## 10. Approvals

- [x] Product Owner approval
- [x] Tech Lead/Architect approval
- [x] Business stakeholder approval

### Sign-off
- **Product Owner**: `Maximiliano Ibarra` - `2026-03-01`
- **Tech Lead**: `Maximiliano Ibarra` - `2026-03-01`
- **Business Owner**: `Maximiliano Ibarra` - `2026-03-01`
