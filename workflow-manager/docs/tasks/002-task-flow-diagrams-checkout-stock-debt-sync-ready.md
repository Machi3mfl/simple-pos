# Task: [TASK-002] Create Flow Diagrams for Critical Journeys

## Task Overview

**Document ID**: `002`  
**File Name**: `002-task-flow-diagrams-checkout-stock-debt-sync-ready.md`  
**Feature**: `POS-001, INVENTORY-001, AR-001, OFFLINE-001`  
**Entity**: `task`  
**Pull Request**: `TBD`  
**Status**: `done`  
**GitHub Issue**: #11  
**Priority**: `high`  
**Assignee**: `TBD`  
**Estimated Effort**: `6h`  
**Actual Effort**: `4h`

### Business Logic Description
Create sequence/activity/state diagrams for checkout, stock movement with cost, debt payment, and offline sync lifecycle to validate behavior before coding.

### Business Rules
- Checkout flow must enforce `cash`/`on_account` rules.
- Inbound stock must require `unitCost` and feed weighted-average basis.
- Offline events must transition through `pending_sync -> synced/failed`.

---

## Acceptance Criteria

### Functional Requirements
- [x] **Given** checkout flow, **When** sequence diagram is created, **Then** it includes customer requirement for `on_account`.
- [x] **Given** inventory flow, **When** activity diagram is created, **Then** it includes mandatory cost input for inbound movement.
- [x] **Given** sync lifecycle, **When** state diagram is created, **Then** it models retry and failure states.

### Non-Functional Requirements
- [x] Maintainability: diagrams are modular and version-controlled.
- [x] Reliability: all critical branches (alternative/exception) are represented.
- [x] Auditability: debt/sync transitions are traceable.

### Error Handling
- [x] **Given** missing exception branch, **When** review runs, **Then** diagram is rejected until completed.
- [x] **Given** conflicting flow assumptions, **When** architecture review happens, **Then** decision is documented in task notes.

---

## Technical Implementation

### Files to Create/Modify
- `workflow-manager/docs/planning/diagrams/sequence-checkout-and-debt.md` (create, Mermaid in markdown)
- `workflow-manager/docs/planning/diagrams/activity-stock-and-onboarding.md` (create, Mermaid in markdown)
- `workflow-manager/docs/planning/diagrams/state-offline-sync.md` (create, Mermaid in markdown)
- `workflow-manager/docs/planning/004-implementation-plan-simple-pos-draft.md` (link diagrams)

### Current Output
- `workflow-manager/docs/planning/diagrams/sequence-checkout-and-debt.md` (created)
- `workflow-manager/docs/planning/diagrams/activity-stock-and-onboarding.md` (created)
- `workflow-manager/docs/planning/diagrams/state-offline-sync.md` (created)

### Dependencies
- `TASK-001`
- `005-ui-reference-pos-v1-draft.md`

---

## Testing Requirements

- [x] Mermaid syntax validated.
- [x] Diagram review with product + architecture stakeholders.
- [x] Consistency check against FR-001..FR-014.

---

## GitHub Issue Seed

**Title**: `[TASK-002] Create Flow Diagrams for Critical Journeys`  
**Issue Template**: `05-task.yml`  
**task_id**: `TASK-002`  
**task_doc**: `workflow-manager/docs/tasks/002-task-flow-diagrams-checkout-stock-debt-sync-ready.md`  
**linked_feature**: `POS-001, INVENTORY-001, AR-001, OFFLINE-001`

---

## Definition of Done

- [x] Required diagrams committed and rendered.
- [x] Links added in planning/feature docs.
- [x] Review approval recorded.
