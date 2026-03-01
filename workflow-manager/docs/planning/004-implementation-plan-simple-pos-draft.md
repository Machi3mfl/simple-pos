# Implementation Plan: simple-pos (MVP)

## Document Metadata

**Document ID**: `004`  
**File Name**: `004-implementation-plan-simple-pos-draft.md`  
**Status**: `in_review`  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.4`  
**Created At**: `2026-02-27`  
**Last Updated**: `2026-03-01`  
**Input Documents**: `001-requirements-simple-pos-draft.md`, `002-prd-simple-pos-draft.md`, `003-backlog-simple-pos-draft.md`

---

## 1. Planning Baseline (Locked Decisions)

| Item | Decision |
| --- | --- |
| Week-1 primary device | `tablet` |
| Payment methods v1 | `cash`, `on_account` |
| Offline requirement | `mandatory` for critical flows |
| Scanner | `phase_2_post_mvp` |
| Ticket printing | `out_of_scope_mvp` |
| Debt credit limit | `no_configurable_limit_in_mvp` |
| Profit costing policy | `weighted_average` |

---

## 1.1 UI Visual Baseline (User-Approved)

The POS UI must follow the user-approved visual reference image provided in this project discussion.

### Non-Negotiable UI Characteristics for MVP Demo
- Three-zone layout: left navigation rail, center product/catalog area, right order summary panel.
- Visual-first interaction with large product cards and large tap targets.
- Strong hierarchy: category chips on top, product grid in center, cart and totals always visible on right.
- Primary action button clearly visible in order panel footer.
- Tablet-first proportions and spacing are the acceptance target.

### Documentation Rule
- Keep this reference linked in feature/issues/PRs for any UI change in `POS-001`.
- If visual changes are proposed, update the reference and re-approve before implementation.
- Canonical visual reference doc: `workflow-manager/docs/planning/005-ui-reference-pos-v1-draft.md`.

---

## 2. MVP Execution Strategy

### Delivery Model
- Vertical slices by feature (UI + API + domain + tests in each slice).
- Tablet-first UX checkpoints before expanding responsive behavior.
- Contract-first API (`/api/v1/...`) with mocked runtime from the beginning.
- Mock-first E2E early, real-backend E2E before release gate.
- No FR/UC can close as backend-only; each implemented scope item must have a usable UI entry point.

### Vertical Slice Completion Rule (Mandatory)
- Every MVP FR/UC must map to a concrete UI surface (screen, panel, or modal) and be delivered as one integrated slice.
- A slice is only `done` when these four evidences exist in the same iteration:
  - `UI`: user can execute the target flow from the assigned surface.
  - `API`: versioned contract endpoint(s) are available and used by that UI flow.
  - `Domain/Application`: use case logic and invariants are enforced in core/application layers.
  - `Tests`: unit/integration/E2E evidence covers happy path and key failure branch.
- Allowed exception type: pure technical governance items (`PBI-010`) and release gate verification (`PBI-013`). Even in these cases, evidence must reference the already integrated UIs they protect/validate.

### Must-Have PBI Scope (from `003`)
- PBI-001, PBI-002, PBI-003, PBI-004, PBI-005, PBI-006, PBI-007, PBI-008, PBI-009, PBI-013, PBI-014, PBI-015, PBI-016, PBI-017, PBI-018, PBI-019

---

## 3. Feature Decomposition

| Feature ID | Feature Name | Linked PBIs | FR/NFR Coverage | Mandatory UI Surface(s) | Planned Iteration |
| --- | --- | --- | --- | --- | --- |
| POS-001 | POS UI mockup and checkout | PBI-001, PBI-002, PBI-005 | FR-001, FR-002, NFR-002, NFR-005 | POS main screen (catalog + cart + checkout footer) | Iteration 1 |
| API-001 | API contracts and mocked runtime | PBI-003, PBI-008, PBI-004, PBI-010 | FR-007, FR-010, NFR-004 | Existing UI surfaces consume `/api/v1` contracts in mock mode (POS, onboarding, stock, debt, reports) | Iteration 2 |
| CATALOG-001 | Guided onboarding, image placeholders, and bulk repricing | PBI-006, PBI-007, PBI-019 | FR-003, FR-008, FR-009, FR-015 | Onboarding wizard + bulk price update screen | Iteration 3 |
| INVENTORY-001 | Stock movement + weighted-average profit basis | PBI-009, PBI-012 | FR-004, FR-006 | Stock movement form + reporting widgets/cards | Iteration 3 + 6 |
| AR-001 | On-account debt and debt payments | PBI-014, PBI-015, PBI-016 | FR-011, FR-012, FR-013, NFR-006 | Checkout customer selector + customer debt ledger/payment screen | Iteration 4 |
| OFFLINE-001 | Offline queue and sync reconciliation | PBI-017, PBI-018 | FR-014, NFR-007 | Offline queue/sync state banner + retry/status panel | Iteration 5 |
| RELEASE-001 | Real-backend release hardening | PBI-013 | NFR-003 + release criteria | Reporting screen (sales history + top products + profit summary) validated against real backend | Iteration 6 |

### 3.1 Use Case to Vertical Slice Coverage (UI Included)

| UC ID | Slice/Feature | UI Surface | API Surface (v1) | Test Evidence |
| --- | --- | --- | --- | --- |
| UC-001 | POS-001 | POS checkout screen | `/api/v1/products`, `/api/v1/sales` | UI + E2E checkout |
| UC-002 | CATALOG-001 | Guided onboarding wizard | `/api/v1/products` | UI + API + E2E onboarding |
| UC-003 | INVENTORY-001 | Stock movement screen | `/api/v1/stock-movements` | UI + integration + E2E |
| UC-004 | RELEASE-001 | Sales history and analytics screen | `/api/v1/reports/*` | UI + API + E2E reporting |
| UC-005 | API-001 | Web client integration through all module screens | `/api/v1/*` contract set | contract tests + cross-screen E2E |
| UC-006 | API-001 | Mock-mode execution on module screens | mocked `/api/v1/*` | mock-mode E2E |
| UC-007 | AR-001 | On-account checkout + debt ledger/payment screen | `/api/v1/customers`, `/api/v1/debt-payments`, `/api/v1/sales` | UI + integration + E2E debt |
| UC-008 | OFFLINE-001 | Offline queue + sync status UI | `/api/v1/sync/events` | offline E2E + sync integration |
| UC-009 | CATALOG-001 | Bulk price update screen | `/api/v1/products/price-batches` | UI + API + integration |

---

## 4. Iteration Plan (Tentative Calendar)

### Iteration 0 - Planning Lock and Architecture Artifacts
**Dates**: `2026-03-02` to `2026-03-06`
- Lock scope and dependencies from `001/002/003`.
- Produce required diagrams (class, sequence, activity, state if needed).
- Create feature docs and traceability links.
- Define OpenAPI v1 skeleton and DTO baseline.
- Publish UC-to-UI-to-API mapping table and get explicit approval.

**Task Batch**
- `TASK-001` Create MVP Domain Class Diagram
- `TASK-002` Create Flow Diagrams for Critical Journeys
- `TASK-003` Define OpenAPI v1 Skeleton and DTO Baseline

**Exit Criteria**
- [x] `004` plan approved.
- [x] Feature docs created and linked.
- [x] Core diagrams published under planning/features docs.
- [x] UC-to-UI mapping approved and linked from requirements/backlog.

### Iteration 1 - Tablet-First POS UI
**Dates**: `2026-03-09` to `2026-03-13`
- Deliver POS visual catalog, cart interactions, and checkout flow (`cash`, `on_account` selection UI).
- Enforce accessibility/usability guardrails (touch targets, readability).

**Task Batch**
- `TASK-004` Implement Tablet POS Layout from Approved Reference
- `TASK-005` Implement Checkout Payment Rules (`cash` / `on_account`)
- `TASK-006` Add Playwright Mock Smoke and UI Baseline Checks

**PBIs**: PBI-001, PBI-002, PBI-005  
**Exit Criteria**
- [x] Demo-ready tablet flow.
- [x] E2E smoke in mock mode passes for checkout happy path.
- [x] UI review approved against the user-provided visual baseline.

### Iteration 2 - Contract and Mock Runtime
**Dates**: `2026-03-16` to `2026-03-20`
- Finalize API contract v1 DTOs and endpoint list.
- Implement mock runtime and Playwright E2E on mocked backend.
- Add architecture guardrails for hexagonal boundaries.

**PBIs**: PBI-008, PBI-003, PBI-004, PBI-010  
**Exit Criteria**
- [x] Contract docs versioned and reviewed.
- [x] Mock critical flows green in CI/local.
- [x] At least one UI flow per active module is wired to `/api/v1` mock endpoints (no static-only UI path).

### Iteration 3 - Catalog and Inventory Core
**Dates**: `2026-03-23` to `2026-03-27`
- Guided product onboarding with placeholder strategy.
- Bulk price update for product batches with preview and audit summary.
- Stock movement with mandatory inbound `unitCost`.
- Persist weighted-average cost basis updates per inbound movement.

**PBIs**: PBI-006, PBI-007, PBI-009, PBI-019  
**Exit Criteria**
- [x] Product onboarding complete without real photos.
- [x] Bulk repricing flow validated for percentage/fixed updates with preview.
- [x] Stock + cost basis update verified by integration tests.
- [x] Onboarding, stock movement, and bulk repricing UIs execute end-to-end against API contracts.

### Iteration 4 - Customer Debt Flows
**Dates**: `2026-03-30` to `2026-04-03`
- Checkout as `on_account` with required customer assignment.
- Debt ledger per order and debt payment registration.
- Debt balance reconciliation and auditability controls.

**PBIs**: PBI-014, PBI-015, PBI-016  
**Exit Criteria**
- [x] Debt lifecycle works end-to-end in mock and real persistence tests.
- [x] Ledger audit checks pass.
- [x] On-account checkout UI and debt payment UI are both integrated and demoable.

### Iteration 5 - Offline Resilience
**Dates**: `2026-04-06` to `2026-04-10`
- Offline queue for critical events (sale/debt).
- Idempotent sync endpoint and reconciliation handling.
- Outage and recovery E2E scenarios.

**PBIs**: PBI-017, PBI-018  
**Exit Criteria**
- [x] Confirmed offline events survive outage and sync after reconnect.
- [x] Conflict handling and retry policy tested.
- [x] Offline state/queue indicators are visible in UI and support manual retry actions.

### Iteration 6 - Release Hardening and Reporting
**Dates**: `2026-04-13` to `2026-04-17`
- Run real-backend E2E release gate.
- Complete reporting items (sales history + weighted-average profit summary).
- Final bugfix hardening and sign-off preparation.

**PBIs**: PBI-013, PBI-011, PBI-012  
**Exit Criteria**
- [x] Real-backend release gate green.
- [ ] FR/NFR traceability checks pass.
- [x] Reporting/history UI consumes real-backend endpoints with validated data.

---

## 5. Architecture Artifacts Plan (Mandatory)

| Artifact | Scope | Owner | Target Iteration |
| --- | --- | --- | --- |
| Class Diagram | Catalog, Inventory, Sales, Accounts Receivable aggregates | Architect/Dev | Iteration 0 |
| Sequence Diagram | Checkout (`cash` and `on_account`), debt payment, offline sync | Architect/Dev | Iteration 0 |
| Activity Diagram | Guided onboarding, stock movement, offline reconciliation flow | Architect/Dev | Iteration 0 |
| State Diagram | Debt status + sync event status (`pending_sync`, `synced`, `failed`) | Architect/Dev | Iteration 0/5 |

Rule: no medium/large feature starts implementation without updated diagrams linked in feature doc and issue.

### Artifact Links (Current)
- Class Diagram (MVP Domain): `workflow-manager/docs/planning/diagrams/class-mvp-domain.md` (TASK-001)
- Sequence Diagram (checkout/debt): `workflow-manager/docs/planning/diagrams/sequence-checkout-and-debt.md` (TASK-002)
- Activity Diagram (stock/onboarding): `workflow-manager/docs/planning/diagrams/activity-stock-and-onboarding.md` (TASK-002)
- State Diagram (offline sync): `workflow-manager/docs/planning/diagrams/state-offline-sync.md` (TASK-002)

---

## 6. Testing and Quality Gates

### Layered Testing Gates
- Domain/Application: unit tests mandatory for business rules (`BR-006`, `BR-008..013`).
- Infrastructure: integration tests mandatory for repositories, ledger persistence, and sync behavior.
- E2E mock: required from Iteration 2 onward for critical flows.
- E2E real backend: required in Iteration 6 before release.

### Release Gates (Must Pass)
- [x] FR coverage: FR-001..FR-015 mapped to implemented PBIs.
- [ ] NFR coverage: NFR-001..NFR-007 validated with evidence.
- [ ] No critical unresolved risk in planning risk list.
- [x] API backward compatibility review completed for `/api/v1`.

---

## 7. GitHub Execution Model

### Issue Creation Order
1. Planning/approval: `[PRD-002]`, `[REQ-001]`, `[PBI-xxx]`.
2. Execution: one issue per feature (`[FEATURE-xxx]`) and one issue per task (`[TASK-xxx]`).
3. PR titles with scope + linked artifact id (e.g., `feat(pos): add cart interactions [PBI-001]`).

### Required Traceability in Every PR
- `Closes #<issue>`
- Linked docs path(s) in `workflow-manager/docs/...`
- Test evidence (unit/integration/e2e)

### Initial Feature Issues to Create
- `[FEATURE-001] POS tablet-first checkout`
- `[FEATURE-002] API v1 contracts and mock runtime`
- `[FEATURE-003] Guided onboarding and placeholders`
- `[FEATURE-004] Inventory cost basis and profit`
- `[FEATURE-005] On-account debt and payments`
- `[FEATURE-006] Offline queue and synchronization`

---

## 8. Main Risks and Contingencies

| Risk ID | Description | Mitigation | Fallback |
| --- | --- | --- | --- |
| R-PLN-001 | Scope drift due to new ideas during MVP | MVP cutline enforced by PBI list | Move extras to post-MVP backlog |
| R-PLN-002 | Offline sync complexity delays release | Build sync in dedicated iteration + idempotency from start | Limit offline to sale/debt only in MVP |
| R-PLN-003 | Tablet UX still complex for operator | Early demos each iteration + usability checklist | Reduce UI options and simplify screens |
| R-PLN-004 | Cost basis mistakes affect profit trust | Mandatory inbound cost + audit trail + integration tests | Add correction flow with audit entries |
| R-PLN-005 | Bulk repricing misconfiguration affects many SKUs | Preview + validation + scoped apply + audit summary | Temporary rollback runbook and selective correction batch |

---

## 9. Planning Completion Checklist

- [x] Feature docs created and linked from this plan.
- [ ] Iteration owners and capacity assigned.
- [x] GitHub issues created from PBIs/features.
- [x] Diagram artifacts committed and linked.
- [x] UI baseline reference linked in POS feature and related issues/PRs.
- [x] All FR/UC items mapped to at least one integrated UI surface.
- [ ] Stakeholder review completed.

### Sign-off
- **Product Owner**: `{name}` - `{date}`
- **Tech Lead / Architect**: `{name}` - `{date}`
- **Business Owner**: `{name}` - `{date}`
