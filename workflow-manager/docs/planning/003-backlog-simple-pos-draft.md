# Product Backlog: simple-pos

## Document Metadata

**Document ID**: `003`  
**File Name**: `003-backlog-simple-pos-draft.md`  
**Status**: `in_review`  
**GitHub Issue**: #2  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.7`  
**Created At**: `2026-02-27`  
**Last Updated**: `2026-03-01`  
**Linked PRD**: `workflow-manager/docs/planning/002-prd-simple-pos-draft.md`

---

## 1. Backlog Strategy

### Prioritization Method
- **Primary Method**: `MoSCoW + risk-first for unknowns`
- **Decision Drivers**: early validation with the real end user (60+ operator), technical risk reduction through API contracts and mock-to-real transition, financial control through debt traceability in on-account sales, profit reliability through mandatory inbound stock cost capture, and operational continuity through offline support.

### Status Definitions
- `candidate`: identified, not refined.
- `ready`: refined and implementable.
- `in_progress`: in active development.
- `blocked`: waiting for dependency/decision.
- `done`: implemented and accepted.

### Vertical Slice Policy (Mandatory)
- Each PBI linked to FR/UC scope must include a concrete UI surface and be delivered as one integrated slice (`UI + API + domain/application + tests`).
- A PBI cannot move to `done` if it leaves a static-only UI or backend-only implementation for a user flow.
- Approved exception type: technical governance/release validation PBIs (`PBI-010`, `PBI-013`). These must still reference the integrated UI flows they validate.

---

## 2. Epics

| Epic ID | Name | Outcome | Priority | Status | PRD Link |
| --- | --- | --- | --- | --- | --- |
| EPIC-001 | POS UI Mock + Responsive UX | Usable and confidence-building customer demo | high | done | Sections 3, 4, 5 |
| EPIC-002 | API Contracts and Mock Runtime | Stable contracts and UI-first testability | high | done | Sections 5, 6, 7 |
| EPIC-003 | Product Onboarding and Inventory Core | Catalog + stock operations with low friction | high | done | Sections 3, 5 |
| EPIC-004 | Sales History and Basic Analytics | Baseline business visibility | medium | done | Sections 5, 6 |
| EPIC-005 | Customer Debt Tracking (On-Account) | Debt per customer/order with payment tracking | high | done | Sections 3, 5, 6 |

---

## 3. Product Backlog Items (PBIs)

| PBI ID | Epic | Type | User Story / Job | Acceptance Criteria | Priority | Estimate | Status | Dependencies | Trace (FR/NFR) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PBI-001 | EPIC-001 | story | As an operator, I want a visual POS catalog so I can sell fast without typing. | Category tabs and product grid support add/remove/update cart actions and respect approved UI baseline layout | high | M | done | none | FR-001, NFR-002 |
| PBI-002 | EPIC-001 | story | As an operator, I want a simple checkout flow so every sale is consistently recorded. | Checkout blocks without payment method; only `cash`/`on_account` are allowed in v1; confirmed sale summary shown | high | M | done | PBI-001 | FR-002 |
| PBI-003 | EPIC-002 | enabler | Build mocked backend mode with adapters/contracts for UI-first development. | Mock mode toggle; module fixtures; deterministic error scenarios | high | M | done | none | FR-010, BR-007 |
| PBI-004 | EPIC-002 | story | Add Playwright E2E for critical flows on mocked backend. | J-001 and J-002 pass locally/CI in mock mode | high | M | done | PBI-003 | FR-010, NFR-003 |
| PBI-005 | EPIC-001 | story | As an older user, I need large touch targets and clear hierarchy to operate safely. | Touch targets >= 44px; <= 3 checkout steps; contrast checks pass; tablet viewport is the primary acceptance target | high | S | done | PBI-001, PBI-002 | NFR-002, NFR-005 |
| PBI-006 | EPIC-003 | story | As support admin, I need a guided onboarding wizard to load products easily. | Wizard requests minimum fields and validates at field level | high | M | done | PBI-001 | FR-003, FR-008 |
| PBI-007 | EPIC-003 | enabler | Implement placeholder image strategy by category. | Product can be saved without real photo and renders fallback image | high | S | done | PBI-006 | FR-009 |
| PBI-008 | EPIC-002 | enabler | Define API contracts v1 (DTO schemas + endpoint list). | Products/sales/stock/reports/customers/debt endpoints documented | high | M | done | none | FR-007, NFR-004 |
| PBI-009 | EPIC-003 | story | Implement stock movement flow (inbound/outbound/adjustment). | Inbound movement requires unit cost; history is stored; stock and weighted-average cost basis are recalculated consistently | high | M | done | PBI-008 | FR-004 |
| PBI-010 | EPIC-002 | enabler | Add architecture guardrails for hexagonal boundaries. | CI flags invalid cross-layer imports | medium | S | done | PBI-008 | NFR-004 |
| PBI-011 | EPIC-004 | story | As owner, I want sales history with date/payment filters. | List and detail views are filterable and consistent | medium | M | done | PBI-008 | FR-005 |
| PBI-012 | EPIC-004 | story | As owner, I want top products and basic profit summary. | Daily/weekly summaries displayed with clear totals using persisted weighted-average stock cost basis | medium | M | done | PBI-011, PBI-009 | FR-006 |
| PBI-013 | EPIC-002 | story | Run critical E2E flows on real backend before release. | Sale/stock/onboarding E2E green against real persistence | high | M | done | PBI-008, PBI-009 | NFR-003, BR-007 |
| PBI-014 | EPIC-005 | story | As an operator, I can mark checkout as `on_account` and link it to a customer. | On-account checkout requires existing or newly created customer | high | M | done | PBI-002, PBI-008 | FR-011 |
| PBI-015 | EPIC-005 | enabler | Store debt ledger entries linked to customer and originating order. | Ledger reflects per-order debt and outstanding customer balance | high | M | done | PBI-014 | FR-012, NFR-006 |
| PBI-016 | EPIC-005 | story | As support admin, I can register debt payments that reduce customer balance. | Debt payment creates ledger movement and updates outstanding total | high | M | done | PBI-015 | FR-013, NFR-006 |
| PBI-017 | EPIC-002 | enabler | Implement offline queue and sync orchestration for critical events (sales/debt). | Offline events are persisted as `pending_sync` and synchronized idempotently after reconnect | high | M | done | PBI-008, PBI-014, PBI-016 | FR-014, NFR-007 |
| PBI-018 | EPIC-002 | story | Validate offline outage/recovery flows with Playwright + integration tests. | E2E covers offline checkout/debt capture and successful sync reconciliation | high | M | done | PBI-017 | FR-014, NFR-007 |
| PBI-019 | EPIC-003 | story | As owner/admin, I want to update many prices in one action so I can react fast to frequent price changes. | Bulk update supports percentage/fixed amount by scope, shows preview, validates invalid results, and writes audit summary | high | M | done | PBI-008, PBI-006 | FR-015 |

---

## 3.1 PBI to UI Surface Mapping (Required)

| PBI ID | Primary UI Surface | Integration Expectation |
| --- | --- | --- |
| PBI-001 | POS catalog and cart area | Product interactions call API/use cases; cart updates are persisted-ready |
| PBI-002 | Checkout section in order panel | Payment selection and sale confirmation use contract-valid API/domain flow |
| PBI-003 | POS/onboarding/stock/debt/report screens in mock mode | Same UI flows run with mocked adapters/contracts |
| PBI-004 | Critical UI journeys (`J-001`, `J-002`) | Playwright validates integrated UI behavior against mocked backend |
| PBI-005 | POS and checkout interaction surfaces | Touch targets, hierarchy, and readability validated on tablet-first viewport |
| PBI-006 | Guided onboarding wizard | Wizard submit path validates and persists through API/use case |
| PBI-007 | Product cards and onboarding preview | Placeholder rendering is visible when photo is missing |
| PBI-008 | All module screens consuming `/api/v1/*` | Contracts drive real request/response integration for active screens |
| PBI-009 | Stock movement screen/form | Inbound cost validation and movement persistence work end-to-end |
| PBI-010 | No standalone UI (`approved exception`) | Architecture guardrails protect all existing UI slices |
| PBI-011 | Sales history screen | Filter interactions query backend and render consistent results |
| PBI-012 | Analytics summary screen/cards | KPI widgets render from report endpoints with weighted-average basis |
| PBI-013 | No new UI (`approved exception`) | Release gate validates integrated UI flows on real backend |
| PBI-014 | Checkout customer selector/creation panel | On-account flow blocks confirmation until customer is assigned |
| PBI-015 | Customer debt ledger screen | Ledger entries and outstanding totals render per customer/order |
| PBI-016 | Debt payment form/modal | Payment registration updates ledger and outstanding balance in UI |
| PBI-017 | Offline status banner and queue panel | Offline capture state is visible and queued actions are trackable |
| PBI-018 | Outage/recovery UI scenarios | UI reflects sync recovery and conflict/retry outcomes |
| PBI-019 | Bulk price update screen | Preview, validation, apply, and audit summary are UI-accessible |

---

## 4. MVP Cutline

### Must-Have for MVP
- [x] PBI-001
- [x] PBI-002
- [x] PBI-003
- [x] PBI-004
- [x] PBI-005
- [x] PBI-006
- [x] PBI-007
- [x] PBI-008
- [x] PBI-009
- [x] PBI-013
- [x] PBI-014
- [x] PBI-015
- [x] PBI-016
- [x] PBI-017
- [x] PBI-018
- [x] PBI-019

### Should-Have (Post-MVP Candidate)
- [x] PBI-011
- [x] PBI-012
- [x] PBI-010

### Won't-Have (Current Cycle)
- Real MercadoPago checkout processing.
- Advanced predictive analytics.
- Automated debt collection workflows.
- Ticket/receipt printing.

---

## 5. Iteration Candidates

### Iteration 1 (Visual UI demo)
- PBI-001
- PBI-002
- PBI-005

### Iteration 2 (Contracts + mock E2E)
- PBI-008
- PBI-003
- PBI-004

### Iteration 3 (Catalog + stock)
- PBI-006
- PBI-007
- PBI-009
- PBI-019

### Iteration 4 (Customer debt tracking)
- PBI-014
- PBI-015
- PBI-016

### Iteration 5 (Offline hardening)
- PBI-017
- PBI-018

### Iteration 6 (Release hardening + reporting)
- PBI-013
- PBI-011
- PBI-012

---

## 6. Definition of Ready (DoR)

- [x] Problem and value are clear.
- [x] Acceptance criteria are testable.
- [x] Dependencies are identified.
- [x] Required API/domain contracts are defined.
- [x] Primary UI surface and route are identified (or approved technical exception).
- [x] UX references are available for the target UI surface.
- [x] Integration scenario (`UI -> API -> domain`) is defined for verification.

## 7. Definition of Done (DoD)

- [x] Acceptance criteria met.
- [x] UI surface is implemented/updated and integrated with API/domain logic (or approved technical exception with referenced UI coverage).
- [x] End-to-end flow is demoable from UI for linked FR/UC.
- [x] Unit/integration/E2E tests added as required.
- [x] Architecture rules respected (Hexagonal boundaries).
- [x] Documentation updated (PRD/backlog/feature/task links).
- [ ] Reviewed and accepted by stakeholder.

---

## 8. Change Log

| Date | Change | Author |
| --- | --- | --- |
| 2026-02-27 | Initial backlog created | maxi |
| 2026-02-27 | Translated to English and added customer debt scope (on-account + debt payments) | maxi |
| 2026-02-27 | Added mandatory inbound stock cost capture for profit reliability | maxi |
| 2026-02-27 | Added offline-required MVP PBIs and fixed v1 payment methods (`cash`, `on_account`) | maxi |
| 2026-02-27 | Closed decisions: primary device `tablet`, costing policy `weighted_average` | maxi |
| 2026-02-27 | Added explicit UI baseline alignment requirement for POS visual implementation | maxi |
| 2026-02-27 | Added bulk price update scope for fast repricing scenarios (`PBI-019`, `FR-015`) | maxi |
| 2026-02-28 | Enforced vertical-slice policy so each PBI/UC closes with integrated UI + API + domain + tests | maxi |
| 2026-03-01 | Refreshed execution statuses after UI+API module E2E real-backend validation | maxi |
