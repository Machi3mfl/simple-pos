# Task: [TASK-011] Add Historical Business Date Support to Cash Sessions

## Task Overview

**Document ID**: `011`
**File Name**: `011-task-cash-session-business-date-backfill-ready.md`
**Feature**: `POS-002`
**Entity**: `task`
**Pull Request**: `TBD`
**Status**: `done`
**GitHub Issue**: `TBD`
**Priority**: `high`
**Assignee**: `TBD`
**Estimated Effort**: `6h`
**Actual Effort**: `6h`

### Business Logic Description

Allow higher-trust operators to open a cash-register session with a historical business date so guided backfill can register sales under the correct operational day without exposing that capability to standard cashiers.

### Business Rules

- Historical session opening must be controlled by a dedicated permission, not by the `system_admin` role name
- The UI must only show the business-date selector when the current actor holds that permission
- Business dates may be today or a past day, but never a future day
- Sales created against an active drawer session must inherit that session business date automatically
- Historical backfill must remain auditable, so persistence keeps a real `recorded_at` trail where the schema did not have one before

---

## Acceptance Criteria

### Functional Requirements

- [x] **Given** a supervisor or manager opens a drawer, **When** they hold the historical-date permission, **Then** they can choose the session business date
- [x] **Given** a cashier opens a drawer, **When** they lack the permission, **Then** the historical-date selector is hidden and the API rejects backdated session opens
- [x] **Given** a sale is registered against an active historical session, **When** it is persisted, **Then** the sale and automatic cash movement inherit that business date

### Non-Functional Requirements

- [x] Authorization remains capability-based and server-enforced
- [x] Existing reporting flows continue using the persisted operational day without requiring UI-level date overrides
- [x] Workflow docs, diagrams, and contract references are updated in the same batch

### Error Handling

- [x] **Given** a future business date is submitted, **When** the request reaches the API, **Then** it returns a validation error
- [x] **Given** an operator without permission tries to use a historical session, **When** they create a sale, **Then** the API returns a forbidden response

---

## Technical Implementation

### Files to Create/Modify

- `supabase/migrations/20260308120000_cash_session_business_date_backfill.sql`
- `src/modules/cash-management/domain/entities/CashRegisterSession.ts`
- `src/app/api/v1/cash-register-sessions/route.ts`
- `src/app/api/v1/sales/route.ts`
- `src/modules/cash-management/presentation/components/CashRegisterSessionPanel.tsx`
- `src/infrastructure/i18n/messages.ts`
- `src/app/api/v1/openapi.yaml`
- `workflow-manager/docs/features/POS-002-cash-register-sessions-and-actor-audit-planning.md`

### Dependencies

- `POS-002 Slice 1`
- `POS-002 Slice 4`
- `POS-002 Slice 6`

---

## Testing Requirements

- [x] API coverage for session open permission and business-date persistence
- [x] API coverage for automatic cash sale propagation from historical sessions
- [x] UI coverage for visibility of the business-date selector by role
- [x] Access-control coverage for the new permission snapshot flag

---

## GitHub Issue Seed

**Title**: `[TASK-011] Add Historical Business Date Support to Cash Sessions`
**Issue Template**: `05-task.yml`
**task_id**: `TASK-011`
**task_doc**: `workflow-manager/docs/tasks/011-task-cash-session-business-date-backfill-ready.md`
**linked_feature**: `POS-002`

---

## Definition of Done

- [x] Historical business-date selection is available only to trusted business roles
- [x] Backfilled sales inherit the active drawer business date automatically
- [x] OpenAPI, diagrams, workflow docs, and E2E coverage are updated

## Implementation Notes

- The new permission code is `cash.session.open.backdate`
- `CashRegisterSession` now persists `businessDate` alongside `openedAt`
- `POST /api/v1/sales` resolves the active drawer session and reuses its business date instead of introducing a second date picker in checkout
- Historical timestamps are pinned to a stable noon-UTC instant so date-based reports stay aligned with the selected operational day
