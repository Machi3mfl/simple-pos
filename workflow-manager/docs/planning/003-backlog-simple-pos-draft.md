# Product Backlog: simple-pos

## Document Metadata

**Document ID**: `003`  
**File Name**: `003-backlog-simple-pos-draft.md`  
**Status**: `draft`  
**GitHub Issue**: #2  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.5`  
**Created At**: `2026-02-27`  
**Last Updated**: `2026-02-27`  
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

---

## 2. Epics

| Epic ID | Name | Outcome | Priority | Status | PRD Link |
| --- | --- | --- | --- | --- | --- |
| EPIC-001 | POS UI Mock + Responsive UX | Usable and confidence-building customer demo | high | ready | Sections 3, 4, 5 |
| EPIC-002 | API Contracts and Mock Runtime | Stable contracts and UI-first testability | high | ready | Sections 5, 6, 7 |
| EPIC-003 | Product Onboarding and Inventory Core | Catalog + stock operations with low friction | high | ready | Sections 3, 5 |
| EPIC-004 | Sales History and Basic Analytics | Baseline business visibility | medium | candidate | Sections 5, 6 |
| EPIC-005 | Customer Debt Tracking (On-Account) | Debt per customer/order with payment tracking | high | ready | Sections 3, 5, 6 |

---

## 3. Product Backlog Items (PBIs)

| PBI ID | Epic | Type | User Story / Job | Acceptance Criteria | Priority | Estimate | Status | Dependencies | Trace (FR/NFR) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PBI-001 | EPIC-001 | story | As an operator, I want a visual POS catalog so I can sell fast without typing. | Category tabs and product grid support add/remove/update cart actions and respect approved UI baseline layout | high | M | ready | none | FR-001, NFR-002 |
| PBI-002 | EPIC-001 | story | As an operator, I want a simple checkout flow so every sale is consistently recorded. | Checkout blocks without payment method; only `cash`/`on_account` are allowed in v1; confirmed sale summary shown | high | M | ready | PBI-001 | FR-002 |
| PBI-003 | EPIC-002 | enabler | Build mocked backend mode with adapters/contracts for UI-first development. | Mock mode toggle; module fixtures; deterministic error scenarios | high | M | ready | none | FR-010, BR-007 |
| PBI-004 | EPIC-002 | story | Add Playwright E2E for critical flows on mocked backend. | J-001 and J-002 pass locally/CI in mock mode | high | M | ready | PBI-003 | FR-010, NFR-003 |
| PBI-005 | EPIC-001 | story | As an older user, I need large touch targets and clear hierarchy to operate safely. | Touch targets >= 44px; <= 3 checkout steps; contrast checks pass; tablet viewport is the primary acceptance target | high | S | ready | PBI-001, PBI-002 | NFR-002, NFR-005 |
| PBI-006 | EPIC-003 | story | As support admin, I need a guided onboarding wizard to load products easily. | Wizard requests minimum fields and validates at field level | high | M | ready | PBI-001 | FR-003, FR-008 |
| PBI-007 | EPIC-003 | enabler | Implement placeholder image strategy by category. | Product can be saved without real photo and renders fallback image | high | S | ready | PBI-006 | FR-009 |
| PBI-008 | EPIC-002 | enabler | Define API contracts v1 (DTO schemas + endpoint list). | Products/sales/stock/reports/customers/debt endpoints documented | high | M | ready | none | FR-007, NFR-004 |
| PBI-009 | EPIC-003 | story | Implement stock movement flow (inbound/outbound/adjustment). | Inbound movement requires unit cost; history is stored; stock and weighted-average cost basis are recalculated consistently | high | M | ready | PBI-008 | FR-004 |
| PBI-010 | EPIC-002 | enabler | Add architecture guardrails for hexagonal boundaries. | CI flags invalid cross-layer imports | medium | S | candidate | PBI-008 | NFR-004 |
| PBI-011 | EPIC-004 | story | As owner, I want sales history with date/payment filters. | List and detail views are filterable and consistent | medium | M | candidate | PBI-008 | FR-005 |
| PBI-012 | EPIC-004 | story | As owner, I want top products and basic profit summary. | Daily/weekly summaries displayed with clear totals using persisted weighted-average stock cost basis | medium | M | candidate | PBI-011, PBI-009 | FR-006 |
| PBI-013 | EPIC-002 | story | Run critical E2E flows on real backend before release. | Sale/stock/onboarding E2E green against real persistence | high | M | candidate | PBI-008, PBI-009 | NFR-003, BR-007 |
| PBI-014 | EPIC-005 | story | As an operator, I can mark checkout as `on_account` and link it to a customer. | On-account checkout requires existing or newly created customer | high | M | ready | PBI-002, PBI-008 | FR-011 |
| PBI-015 | EPIC-005 | enabler | Store debt ledger entries linked to customer and originating order. | Ledger reflects per-order debt and outstanding customer balance | high | M | ready | PBI-014 | FR-012, NFR-006 |
| PBI-016 | EPIC-005 | story | As support admin, I can register debt payments that reduce customer balance. | Debt payment creates ledger movement and updates outstanding total | high | M | ready | PBI-015 | FR-013, NFR-006 |
| PBI-017 | EPIC-002 | enabler | Implement offline queue and sync orchestration for critical events (sales/debt). | Offline events are persisted as `pending_sync` and synchronized idempotently after reconnect | high | M | ready | PBI-008, PBI-014, PBI-016 | FR-014, NFR-007 |
| PBI-018 | EPIC-002 | story | Validate offline outage/recovery flows with Playwright + integration tests. | E2E covers offline checkout/debt capture and successful sync reconciliation | high | M | ready | PBI-017 | FR-014, NFR-007 |
| PBI-019 | EPIC-003 | story | As owner/admin, I want to update many prices in one action so I can react fast to frequent price changes. | Bulk update supports percentage/fixed amount by scope, shows preview, validates invalid results, and writes audit summary | high | M | ready | PBI-008, PBI-006 | FR-015 |

---

## 4. MVP Cutline

### Must-Have for MVP
- [ ] PBI-001
- [ ] PBI-002
- [ ] PBI-003
- [ ] PBI-004
- [ ] PBI-005
- [ ] PBI-006
- [ ] PBI-007
- [ ] PBI-008
- [ ] PBI-009
- [ ] PBI-013
- [ ] PBI-014
- [ ] PBI-015
- [ ] PBI-016
- [ ] PBI-017
- [ ] PBI-018
- [ ] PBI-019

### Should-Have (Post-MVP Candidate)
- [ ] PBI-011
- [ ] PBI-012
- [ ] PBI-010

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

- [ ] Problem and value are clear.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies are identified.
- [ ] Required API/domain contracts are defined.
- [ ] UX references are available (if UI item).

## 7. Definition of Done (DoD)

- [ ] Acceptance criteria met.
- [ ] Unit/integration/E2E tests added as required.
- [ ] Architecture rules respected (Hexagonal boundaries).
- [ ] Documentation updated (PRD/backlog/feature/task links).
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
