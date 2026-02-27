# Product Backlog: {product-or-feature-name}

## Document Metadata

**Document ID**: `{sequential-id}` (e.g., `001`, `002`)  
**File Name**: `{sequential-id}-backlog-{short-description}-{status}.md`  
**Status**: `draft` | `planning` | `ready` | `in_progress` | `review` | `approved` | `completed`  
**Owner**: `{product-owner}`  
**Author**: `{author}`  
**Version**: `{version}`  
**Created At**: `{yyyy-mm-dd}`  
**Last Updated**: `{yyyy-mm-dd}`  
**Linked PRD**: `{prd-doc-link}`

---

## 1. Backlog Strategy

### Prioritization Method
- **Primary Method**: `{method}` (e.g., MoSCoW, RICE, WSJF)
- **Decision Drivers**:
  - {driver-1}
  - {driver-2}

### Status Definitions
- `candidate`: identified, not refined
- `ready`: refined and implementable
- `in_progress`: in active development
- `blocked`: waiting dependency/decision
- `done`: implemented and accepted

---

## 2. Epics

| Epic ID | Name | Outcome | Priority | Status | PRD Link |
| --- | --- | --- | --- | --- | --- |
| EPIC-001 | {name} | {business-outcome} | high | ready | {PRD section} |
| EPIC-002 | {name} | {business-outcome} | medium | candidate | {PRD section} |

---

## 3. Product Backlog Items (PBIs)

| PBI ID | Epic | Type | User Story / Job | Acceptance Criteria | Priority | Estimate | Status | Dependencies | Trace (FR/NFR) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PBI-001 | EPIC-001 | story | As a {role}, I want {goal} so that {benefit}. | {ac-summary} | high | M | ready | none | FR-001 |
| PBI-002 | EPIC-001 | enabler | Create API contract for {resource}. | {ac-summary} | high | M | ready | PBI-001 | FR-00X |
| PBI-003 | EPIC-002 | spike | Evaluate {unknown}. | {ac-summary} | medium | S | candidate | none | NFR-00X |

---

## 4. MVP Cutline

### Must-Have for MVP
- [ ] PBI-001
- [ ] PBI-002

### Should-Have (Post-MVP Candidate)
- [ ] PBI-010
- [ ] PBI-011

### Won't-Have (Current Cycle)
- {explicitly-deferred-item}

---

## 5. Iteration Candidates

### Iteration 1
- PBI-001
- PBI-002

### Iteration 2
- PBI-003
- PBI-004

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
| {yyyy-mm-dd} | Initial backlog created | {author} |
