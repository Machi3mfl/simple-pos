# Implementation Plan: simple-pos (MVP)

## Document Metadata

**Document ID**: `004`  
**File Name**: `004-implementation-plan-simple-pos-draft.md`  
**Status**: `planning`  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.2`  
**Created At**: `2026-02-27`  
**Last Updated**: `2026-02-27`  
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

### Must-Have PBI Scope (from `003`)
- PBI-001, PBI-002, PBI-003, PBI-004, PBI-005, PBI-006, PBI-007, PBI-008, PBI-009, PBI-013, PBI-014, PBI-015, PBI-016, PBI-017, PBI-018

---

## 3. Feature Decomposition

| Feature ID | Feature Name | Linked PBIs | FR/NFR Coverage | Planned Iteration |
| --- | --- | --- | --- | --- |
| POS-001 | POS UI mockup and checkout | PBI-001, PBI-002, PBI-005 | FR-001, FR-002, NFR-002, NFR-005 | Iteration 1 |
| API-001 | API contracts and mocked runtime | PBI-003, PBI-008, PBI-004, PBI-010 | FR-007, FR-010, NFR-004 | Iteration 2 |
| CATALOG-001 | Guided onboarding and image placeholders | PBI-006, PBI-007 | FR-003, FR-008, FR-009 | Iteration 3 |
| INVENTORY-001 | Stock movement + weighted-average profit basis | PBI-009, PBI-012 | FR-004, FR-006 | Iteration 3 + 6 |
| AR-001 | On-account debt and debt payments | PBI-014, PBI-015, PBI-016 | FR-011, FR-012, FR-013, NFR-006 | Iteration 4 |
| OFFLINE-001 | Offline queue and sync reconciliation | PBI-017, PBI-018 | FR-014, NFR-007 | Iteration 5 |
| RELEASE-001 | Real-backend release hardening | PBI-013 | NFR-003 + release criteria | Iteration 6 |

---

## 4. Iteration Plan (Tentative Calendar)

### Iteration 0 - Planning Lock and Architecture Artifacts
**Dates**: `2026-03-02` to `2026-03-06`
- Lock scope and dependencies from `001/002/003`.
- Produce required diagrams (class, sequence, activity, state if needed).
- Create feature docs and traceability links.
- Define OpenAPI v1 skeleton and DTO baseline.

**Task Batch**
- `TASK-001` Create MVP Domain Class Diagram
- `TASK-002` Create Flow Diagrams for Critical Journeys
- `TASK-003` Define OpenAPI v1 Skeleton and DTO Baseline

**Exit Criteria**
- [ ] `004` plan approved.
- [ ] Feature docs created and linked.
- [ ] Core diagrams published under planning/features docs.

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
- [ ] Demo-ready tablet flow.
- [ ] E2E smoke in mock mode passes for checkout happy path.
- [ ] UI review approved against the user-provided visual baseline.

### Iteration 2 - Contract and Mock Runtime
**Dates**: `2026-03-16` to `2026-03-20`
- Finalize API contract v1 DTOs and endpoint list.
- Implement mock runtime and Playwright E2E on mocked backend.
- Add architecture guardrails for hexagonal boundaries.

**PBIs**: PBI-008, PBI-003, PBI-004, PBI-010  
**Exit Criteria**
- [ ] Contract docs versioned and reviewed.
- [ ] Mock critical flows green in CI/local.

### Iteration 3 - Catalog and Inventory Core
**Dates**: `2026-03-23` to `2026-03-27`
- Guided product onboarding with placeholder strategy.
- Stock movement with mandatory inbound `unitCost`.
- Persist weighted-average cost basis updates per inbound movement.

**PBIs**: PBI-006, PBI-007, PBI-009  
**Exit Criteria**
- [ ] Product onboarding complete without real photos.
- [ ] Stock + cost basis update verified by integration tests.

### Iteration 4 - Customer Debt Flows
**Dates**: `2026-03-30` to `2026-04-03`
- Checkout as `on_account` with required customer assignment.
- Debt ledger per order and debt payment registration.
- Debt balance reconciliation and auditability controls.

**PBIs**: PBI-014, PBI-015, PBI-016  
**Exit Criteria**
- [ ] Debt lifecycle works end-to-end in mock and real persistence tests.
- [ ] Ledger audit checks pass.

### Iteration 5 - Offline Resilience
**Dates**: `2026-04-06` to `2026-04-10`
- Offline queue for critical events (sale/debt).
- Idempotent sync endpoint and reconciliation handling.
- Outage and recovery E2E scenarios.

**PBIs**: PBI-017, PBI-018  
**Exit Criteria**
- [ ] Confirmed offline events survive outage and sync after reconnect.
- [ ] Conflict handling and retry policy tested.

### Iteration 6 - Release Hardening and Reporting
**Dates**: `2026-04-13` to `2026-04-17`
- Run real-backend E2E release gate.
- Complete reporting items (sales history + weighted-average profit summary).
- Final bugfix hardening and sign-off preparation.

**PBIs**: PBI-013, PBI-011, PBI-012  
**Exit Criteria**
- [ ] Real-backend release gate green.
- [ ] FR/NFR traceability checks pass.

---

## 5. Architecture Artifacts Plan (Mandatory)

| Artifact | Scope | Owner | Target Iteration |
| --- | --- | --- | --- |
| Class Diagram | Catalog, Inventory, Sales, Accounts Receivable aggregates | Architect/Dev | Iteration 0 |
| Sequence Diagram | Checkout (`cash` and `on_account`), debt payment, offline sync | Architect/Dev | Iteration 0 |
| Activity Diagram | Guided onboarding, stock movement, offline reconciliation flow | Architect/Dev | Iteration 0 |
| State Diagram | Debt status + sync event status (`pending_sync`, `synced`, `failed`) | Architect/Dev | Iteration 0/5 |

Rule: no medium/large feature starts implementation without updated diagrams linked in feature doc and issue.

---

## 6. Testing and Quality Gates

### Layered Testing Gates
- Domain/Application: unit tests mandatory for business rules (`BR-006`, `BR-008..013`).
- Infrastructure: integration tests mandatory for repositories, ledger persistence, and sync behavior.
- E2E mock: required from Iteration 2 onward for critical flows.
- E2E real backend: required in Iteration 6 before release.

### Release Gates (Must Pass)
- [ ] FR coverage: FR-001..FR-014 mapped to implemented PBIs.
- [ ] NFR coverage: NFR-001..NFR-007 validated with evidence.
- [ ] No critical unresolved risk in planning risk list.
- [ ] API backward compatibility review completed for `/api/v1`.

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

---

## 9. Planning Completion Checklist

- [ ] Feature docs created and linked from this plan.
- [ ] Iteration owners and capacity assigned.
- [ ] GitHub issues created from PBIs/features.
- [ ] Diagram artifacts committed and linked.
- [ ] UI baseline reference linked in POS feature and related issues/PRs.
- [ ] Stakeholder review completed.

### Sign-off
- **Product Owner**: `{name}` - `{date}`
- **Tech Lead / Architect**: `{name}` - `{date}`
- **Business Owner**: `{name}` - `{date}`
