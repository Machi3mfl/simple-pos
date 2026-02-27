# Runbook: Iteration 0 and 1 Daily Execution

## Document Metadata

**Document ID**: `001`  
**File Name**: `001-runbook-iteration-0-1-daily-execution-ready.md`  
**Status**: `ready`  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.1`  
**Created At**: `2026-02-27`  
**Last Updated**: `2026-02-27`  
**Source Plan**: `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md`

---

## 1. Scope

This runbook operationalizes:
- Iteration 0 (`2026-03-02` to `2026-03-06`): `TASK-001`, `TASK-002`, `TASK-003`
- Iteration 1 (`2026-03-09` to `2026-03-13`): `TASK-004`, `TASK-005`, `TASK-006`

Issue references:
- `#9` TASK-001
- `#11` TASK-002
- `#10` TASK-003
- `#14` TASK-004
- `#12` TASK-005
- `#13` TASK-006

---

## 2. Branch and PR Plan (Exact Naming)

| Task | Issue | Branch | PR Title |
| --- | --- | --- | --- |
| TASK-001 | #9 | `feat/task-001-domain-class-diagram` | `docs(diagrams): add MVP domain class diagram [TASK-001]` |
| TASK-002 | #11 | `feat/task-002-critical-flow-diagrams` | `docs(diagrams): add critical flow diagrams for checkout stock debt sync [TASK-002]` |
| TASK-003 | #10 | `feat/task-003-openapi-v1-dto-baseline` | `feat(api): define OpenAPI v1 skeleton and DTO baseline [TASK-003]` |
| TASK-004 | #14 | `feat/task-004-tablet-pos-layout` | `feat(pos): implement tablet POS layout from approved reference [TASK-004]` |
| TASK-005 | #12 | `feat/task-005-checkout-payment-rules` | `feat(checkout): enforce cash and on_account checkout rules [TASK-005]` |
| TASK-006 | #13 | `feat/task-006-playwright-mock-visual` | `test(e2e): add mock smoke and visual baseline checks [TASK-006]` |

---

## 3. Planned Commit Sets (Exact Messages)

### TASK-001 (Issue #9)
1. `docs(diagrams): add mvp domain class diagram skeleton [TASK-001]`
2. `docs(diagrams): refine aggregate boundaries and repository ownership [TASK-001]`
3. `docs(plan): link class diagram in implementation plan and feature docs [TASK-001]`

### TASK-002 (Issue #11)
1. `docs(diagrams): add sequence diagram for checkout and debt flow [TASK-002]`
2. `docs(diagrams): add activity diagram for stock and onboarding [TASK-002]`
3. `docs(diagrams): add offline sync state diagram and planning links [TASK-002]`

### TASK-003 (Issue #10)
1. `feat(api): add openapi v1 skeleton with endpoint groups [TASK-003]`
2. `feat(api): add dto baseline for sales stock debt and sync [TASK-003]`
3. `test(api): validate openapi schema and sample payloads [TASK-003]`

### TASK-004 (Issue #14)
1. `feat(pos): implement three-zone tablet layout shell [TASK-004]`
2. `feat(pos): add catalog and order summary panels [TASK-004]`
3. `test(pos): add tablet layout component coverage [TASK-004]`

### TASK-005 (Issue #12)
1. `feat(checkout): enforce payment method enum cash and on_account [TASK-005]`
2. `feat(checkout): require customer assignment for on_account [TASK-005]`
3. `test(checkout): cover payment validation and blocking rules [TASK-005]`

### TASK-006 (Issue #13)
1. `test(e2e): add playwright mock checkout smoke flow [TASK-006]`
2. `test(e2e): add visual baseline checks for three-zone pos layout [TASK-006]`
3. `ci(e2e): persist trace screenshot and video artifacts [TASK-006]`

---

## 4. Daily Board (Day-by-Day)

| Date | Day Goal | Issue Move (Label Transition) | Branch / PR Action | End-of-Day Output |
| --- | --- | --- | --- | --- |
| 2026-03-02 | Start TASK-001 class diagram draft | #9: `status:ready -> status:in_progress` | Create branch `feat/task-001-domain-class-diagram` | Diagram skeleton committed |
| 2026-03-03 | Close TASK-001 and start TASK-002 | #9: `status:in_progress -> status:review`; #11: `status:ready -> status:in_progress` | Open PR for TASK-001; create branch `feat/task-002-critical-flow-diagrams` | TASK-001 PR open, TASK-002 sequence draft |
| 2026-03-04 | Close TASK-002 | #11: `status:in_progress -> status:review` | Open PR for TASK-002 | Sequence/activity/state diagrams complete |
| 2026-03-05 | Start TASK-003 OpenAPI baseline | #10: `status:ready -> status:in_progress` | Create branch `feat/task-003-openapi-v1-dto-baseline` | OpenAPI skeleton + first DTO set |
| 2026-03-06 | Close TASK-003 and Iteration 0 | #10: `status:in_progress -> status:review`; Iteration 0 tasks to `status:done` after merge | Open PR for TASK-003 and merge pending reviewed PRs | Iteration 0 exit criteria satisfied |
| 2026-03-09 | Start TASK-004 tablet layout | #14: `status:ready -> status:in_progress` | Create branch `feat/task-004-tablet-pos-layout` | Three-zone layout shell implemented |
| 2026-03-10 | Close TASK-004 | #14: `status:in_progress -> status:review` | Open PR for TASK-004 | Visual parity check against approved reference |
| 2026-03-11 | Start TASK-005 checkout rules | #12: `status:ready -> status:in_progress` | Create branch `feat/task-005-checkout-payment-rules` | Rule enforcement in UI + API started |
| 2026-03-12 | Close TASK-005 and start TASK-006 | #12: `status:in_progress -> status:review`; #13: `status:ready -> status:in_progress` | Open PR for TASK-005; create branch `feat/task-006-playwright-mock-visual` | Checkout validations done, E2E scaffolding started |
| 2026-03-13 | Close TASK-006 and Iteration 1 | #13: `status:in_progress -> status:review`; Iteration 1 tasks to `status:done` after merge | Open PR for TASK-006 and merge pending reviewed PRs | Mock smoke tests + visual baseline ready for demo |

---

## 5. PR Checklist (Mandatory)

Every PR in this runbook must include:
- `Closes #<issue>`
- Linked docs under `workflow-manager/docs/...`
- Test evidence (unit/integration/e2e as applicable)
- Architecture impact by layer (domain/application/infrastructure/presentation)

---

## 6. Operational Rules

1. Do not start TASK-004 before TASK-003 is merged.
2. Do not close TASK-005 without enforcing validation both in UI and API contracts.
3. TASK-006 must run in mock mode without requiring fully functional backend.
4. If a task slips by 1 business day, freeze new starts and recover before opening next task.

---

## 7. Completion Criteria

Iteration 0 is complete only if:
- TASK-001, TASK-002, TASK-003 merged
- Diagram and OpenAPI artifacts linked from planning/features docs

Iteration 1 is complete only if:
- TASK-004, TASK-005, TASK-006 merged
- POS UI validated against approved visual baseline
- Playwright mock smoke and visual checks passing
