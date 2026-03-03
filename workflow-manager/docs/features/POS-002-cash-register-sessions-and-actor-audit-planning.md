# [POS-002] Feature: Cash Register Sessions and Actor Audit Planning

## Metadata

**Feature ID**: `POS-002`
**Status**: `planning`
**GitHub Issue**: `TBD`
**Priority**: `high`
**Linked Scope**: `post-MVP operations control`, `actor attribution`, `future roles`
**Planning Reference**: `workflow-manager/docs/planning/007-execution-status-simple-pos-ready.md`
**Architecture Artifacts**:
- `workflow-manager/docs/planning/diagrams/class-cash-register-session-domain.md`
- `workflow-manager/docs/planning/diagrams/sequence-cash-register-open-close.md`
- `workflow-manager/docs/planning/diagrams/activity-cash-register-day.md`
- `workflow-manager/docs/planning/diagrams/state-cash-register-session.md`

---

## Business Goal

Add a real POS cash-register flow so the operator can:

- open a register for the day or shift,
- enter the opening float (`cambio inicial`),
- record all cash-affecting events during the day,
- close the register with a counted cash total,
- compare counted cash versus expected cash,
- preserve who performed each action in a role-ready way.

This feature should solve two gaps at the same time:

1. operational cash control for a physical drawer/register,
2. scalable actor attribution before and after authentication/roles are added.

---

## Current Baseline

Today the repository already supports:

- POS checkout with `cash` and `on_account`,
- debt payments with `cash`,
- stock movement audit history,
- offline queue for critical sales/debt events,
- basic ad hoc actor capture in one endpoint through `x-actor-id`.

Current gaps:

- no `CashRegister` or `CashRegisterSession` entity exists,
- no open/close register flow exists in UI or API,
- no cash ledger exists for non-sale movements such as `paid in`, `paid out`, or `safe drop`,
- the real backend currently uses a global service-role Supabase client, so authenticated user attribution is not yet part of request execution,
- there is no app-level user/role model for future authorization.

Important architectural note:

- `workflow-manager/docs/planning/001-requirements-simple-pos-draft.md` already mentions "POS session is open" as a precondition in `UC-001`, but that precondition is not implemented yet.

---

## Research Summary

Operational research from major POS vendors converges on the same baseline:

- a cash-handling day starts with an opening float / starting cash amount,
- cash tracking is tied to a specific register or device session,
- operators need non-sale cash movements such as `paid in`, `paid out`, or cash removal to a safe,
- closing compares a counted amount against an expected amount derived from all cash movements,
- some businesses leave a float in the drawer and remove the remainder during closeout.

References reviewed:

- Shopify Help Center, cash tracking in POS: opening cash, counted closeout, and final cash tracking summary.
  - https://help.shopify.com/en/manual/sell-in-person/shopify-pos/cash-register-management/cash-tracking
- Square Support, cash management: starting cash, cash paid in, and cash paid out.
  - https://squareup.com/help/us/en/article/8344-start-and-end-a-cash-drawer-session-on-square-pos
- Lightspeed Retail, close register and leave a float amount.
  - https://retail-support.lightspeedhq.com/hc/en-us/articles/360036977513-Closing-a-register-in-Retail-POS-X-Series

Practical conclusion for this project:

- "poner el cambio" is correctly modeled as an opening float amount,
- expected cash cannot be computed from sales alone,
- debt payments in cash must also affect the cash drawer,
- manual cash adjustments need their own audit trail and reason codes,
- one open session per register is the minimum operational invariant.

---

## Architecture Decision

### Pattern Choice

The best fit is:

- `CashRegister` as the physical/logical drawer/device,
- `CashRegisterSession` as the aggregate root for one open/close cycle,
- `CashMovement` as an immutable ledger entity for every cash-affecting event,
- `CashCount` as a value object for optional denomination breakdown,
- `ActorContext` as an application-level execution context passed into command use cases,
- `AuthorizationService` as a core port for future role checks.

Why this fits:

- the register session owns the lifecycle invariant,
- immutable cash movements make expected balance explainable and auditable,
- the core stays framework-agnostic,
- future role checks stay outside React/Next/Supabase details,
- the design scales better than sprinkling free-form `user_name` text fields across tables.

### Explicit Rejections

- Do not put balance calculation in DB triggers or stored procedures.
  - Reason: the project rules explicitly keep business logic in the application core.
- Do not rely on `x-actor-id` headers as the long-term actor model.
  - Reason: headers are fine for mocks, but not for real identity, authorization, or traceability.
- Do not store only `user_name` in business rows.
  - Reason: names change, collide, and cannot support role queries or stable joins.
- Do not jump to full event sourcing.
  - Reason: an immutable domain ledger plus regular aggregates is enough here and far simpler to operate.

---

## Proposed Domain Model

### Core Entities and Value Objects

- `CashRegister`
  - identity of the physical or logical POS drawer
  - examples: `front_counter`, `tablet_1_drawer`
- `CashRegisterSession`
  - one open-to-close cycle for one register
  - stores opening float, current expected balance snapshot, close summary, and status
- `CashMovement`
  - immutable cash-affecting event linked to the session
  - types:
    - `opening_float`
    - `cash_sale`
    - `debt_payment_cash`
    - `cash_paid_in`
    - `cash_paid_out`
    - `safe_drop`
    - `refund_cash`
    - `adjustment`
- `CashCount`
  - optional denomination lines for open/close counting
- `ActorContext`
  - application metadata for commands:
    - `actorId`
    - `actorKind`
    - `roleCodes`
    - `correlationId`

### Business Rules

- Only one open session can exist per register at a time.
- Opening a session records an opening float movement immediately.
- Expected cash is derived from:
  - `opening_float`
  - `cash_sale`
  - `debt_payment_cash`
  - `cash_paid_in`
  - minus `cash_paid_out`
  - minus `safe_drop`
  - minus `refund_cash`
  - plus/minus `adjustment`
- Closing stores both:
  - expected amount seen by the system,
  - counted amount entered by the operator.
- Discrepancy is `counted - expected`.
- Manual cash movements require a reason code or note.
- A discrepancy above configured tolerance should require a supervisor-capable role to close.
- Cash sales and cash debt payments should append cash movements automatically through application orchestration, not by SQL side effects.

### Recommended Module Layout

```text
src/modules/cash-management/
├── domain/
│   ├── entities/
│   │   ├── CashRegister.ts
│   │   ├── CashRegisterSession.ts
│   │   └── CashMovement.ts
│   ├── value-objects/
│   │   ├── CashCount.ts
│   │   └── DenominationCount.ts
│   ├── errors/
│   └── repositories/
├── application/
│   ├── use-cases/
│   │   ├── OpenCashRegisterSessionUseCase.ts
│   │   ├── RecordCashMovementUseCase.ts
│   │   ├── CloseCashRegisterSessionUseCase.ts
│   │   └── GetActiveCashRegisterSessionUseCase.ts
│   └── ports/
│       └── AuthorizationService.ts
├── infrastructure/
│   ├── repositories/
│   └── runtime/
└── presentation/
    ├── components/
    └── dtos/
```

---

## Proposed Persistence Model

### Cash Tables

```sql
create table cash_registers (
  id text primary key,
  name text not null,
  location_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cash_register_sessions (
  id text primary key,
  cash_register_id text not null references cash_registers(id),
  status text not null check (status in ('open', 'closing_review_required', 'closed', 'voided')),
  opening_float_amount numeric(12, 4) not null check (opening_float_amount >= 0),
  expected_balance_amount numeric(12, 4) not null check (expected_balance_amount >= 0),
  counted_closing_amount numeric(12, 4),
  discrepancy_amount numeric(12, 4),
  opened_at timestamptz not null,
  opened_by_user_id text not null references app_users(id),
  closed_at timestamptz,
  closed_by_user_id text references app_users(id),
  opening_notes text,
  closing_notes text
);

create unique index uniq_open_cash_session_per_register
  on cash_register_sessions (cash_register_id)
  where status in ('open', 'closing_review_required');

create table cash_movements (
  id text primary key,
  cash_register_session_id text not null references cash_register_sessions(id) on delete cascade,
  movement_type text not null check (
    movement_type in (
      'opening_float',
      'cash_sale',
      'debt_payment_cash',
      'cash_paid_in',
      'cash_paid_out',
      'safe_drop',
      'refund_cash',
      'adjustment'
    )
  ),
  amount numeric(12, 4) not null check (amount > 0),
  direction text not null check (direction in ('in', 'out')),
  occurred_at timestamptz not null,
  performed_by_user_id text not null references app_users(id),
  sale_id text references sales(id),
  debt_ledger_entry_id text references debt_ledger(id),
  reason_code text,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);
```

### Optional Count Breakdown Table

Use this only if denomination-level reconciliation is desired from day 1:

```sql
create table cash_session_counts (
  id text primary key,
  cash_register_session_id text not null references cash_register_sessions(id) on delete cascade,
  count_phase text not null check (count_phase in ('opening', 'closing')),
  denomination_value numeric(12, 4) not null check (denomination_value > 0),
  quantity integer not null check (quantity >= 0),
  recorded_by_user_id text not null references app_users(id)
);
```

Recommendation:

- open with total amount only in v1,
- make denomination breakdown optional but supported in the model,
- strongly consider denomination breakdown on close because it helps explain discrepancies.

---

## Actor and Role Strategy

### Scalable Recommendation

Create an app-level identity boundary now, even before full login is implemented.

```sql
create table app_users (
  id text primary key,
  auth_user_id uuid unique,
  display_name text not null,
  actor_kind text not null check (actor_kind in ('human', 'system')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table roles (
  id text primary key,
  code text not null unique,
  name text not null
);

create table user_role_assignments (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  role_id text not null references roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by_user_id text references app_users(id),
  unique (user_id, role_id)
);
```

Why `app_users` instead of referencing `auth.users` everywhere:

- business tables should not be hard-coupled to one auth provider,
- the project can persist operator attribution before login exists,
- later authentication can attach `auth_user_id` to the existing user record,
- system actors such as `offline-sync` or `migration` can be represented cleanly,
- future display names and deactivation rules stay in application space.

### Recommended Attribution Rules

- Event-like tables should store `performed_by_user_id`.
  - Examples: `cash_movements`, `debt_ledger`, `stock_movements`
- Lifecycle tables should store explicit semantic actor columns.
  - Examples: `opened_by_user_id`, `closed_by_user_id`, `created_by_user_id`, `updated_by_user_id`
- Do not rely only on generic `updated_by_user_id` when the event itself is important.

### Request Execution Recommendation

Long-term target:

- replace the global service-role request path for user-facing commands,
- create a request-scoped Supabase SSR client,
- resolve the current authenticated user from the request,
- map that auth identity to `app_users`,
- build `ActorContext`,
- pass `ActorContext` into use cases.

Supabase references reviewed for this direction:

- Next.js server-side auth guide:
  - https://supabase.com/docs/guides/auth/server-side/nextjs
- Custom claims and RBAC guide:
  - https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac

Temporary bridge before login exists:

- let the operator pick an `app_user` in the UI,
- persist that selected operator as `actorId`,
- keep the same use-case signatures,
- later swap the actor source from "UI-selected operator" to "authenticated request user" without rewriting the domain model.

### Recommended Application Types

```ts
export interface ActorContext {
  readonly actorId: string;
  readonly actorKind: "human" | "system";
  readonly roleCodes: readonly string[];
  readonly correlationId: string;
}

export interface OpenCashRegisterSessionUseCaseInput {
  readonly registerId: string;
  readonly openingFloatAmount: number;
  readonly openingNotes?: string;
  readonly actor: ActorContext;
}

export interface CloseCashRegisterSessionUseCaseInput {
  readonly sessionId: string;
  readonly countedClosingAmount: number;
  readonly closingNotes?: string;
  readonly actor: ActorContext;
}
```

---

## API and Integration Proposal

### Proposed Endpoints

- `GET /api/v1/cash-registers`
- `POST /api/v1/cash-registers`
- `GET /api/v1/cash-registers/{id}/active-session`
- `POST /api/v1/cash-register-sessions`
- `POST /api/v1/cash-register-sessions/{id}/movements`
- `POST /api/v1/cash-register-sessions/{id}/close`
- `GET /api/v1/cash-register-sessions?registerId=...&status=...&dateFrom=...&dateTo=...`

### Command Examples

Open a register:

```bash
curl -X POST /api/v1/cash-register-sessions \
  -H "content-type: application/json" \
  -d '{
    "registerId": "front-counter",
    "openingFloatAmount": 15000,
    "openingNotes": "Cambio inicial"
  }'
```

Record a manual cash-out:

```bash
curl -X POST /api/v1/cash-register-sessions/session_123/movements \
  -H "content-type: application/json" \
  -d '{
    "movementType": "cash_paid_out",
    "amount": 2500,
    "reasonCode": "petty_cash",
    "notes": "Compra de bolsas"
  }'
```

Close a register:

```bash
curl -X POST /api/v1/cash-register-sessions/session_123/close \
  -H "content-type: application/json" \
  -d '{
    "countedClosingAmount": 43250,
    "closingNotes": "Conteo final"
  }'
```

### Required Existing Integrations

- `CreateSaleUseCase`
  - when `paymentMethod === "cash"`, append `cash_sale`
- `RegisterDebtPaymentUseCase`
  - when `paymentMethod === "cash"`, append `debt_payment_cash`
- offline sync
  - later extend the event queue with:
    - `cash_session_opened`
    - `cash_movement_recorded`
    - `cash_session_closed`

---

## Recommended Rollout

### Delivery Rule for Every Slice

Every implementation slice for `POS-002` must be delivered as a complete vertical circuit:

- `UI`: the operator can execute the flow from a real screen, panel, or modal,
- `API`: the UI uses the real `/api/v1/...` contract for that slice,
- `Domain/Application`: business rules are enforced in entities, services, and use cases,
- `Persistence`: the required repositories and tables exist for the slice,
- `Tests`: the slice includes the minimum unit/integration/E2E evidence needed for safe review.

Additional execution rule:

- do not start a backend-only or static-UI-only slice,
- split work into small, reviewable, demoable deliverables,
- each slice should be independently testable before starting the next one.

### Slice 1: Register session core

- create register catalog
- open session
- show active session
- close session with expected vs counted
- no denomination breakdown required yet
- mandatory UI checkpoint:
  - register selector + open-session form + active-session summary + close-session form

### Slice 2: Cash movement ledger

- manual `paid in`, `paid out`, `safe drop`, `adjustment`
- expected balance updates from immutable movements
- basic closing discrepancy notes
- mandatory UI checkpoint:
  - active-session movement list + add-movement modal/form + updated expected balance view

### Slice 3: Automatic integrations

- auto-record `cash_sale`
- auto-record `debt_payment_cash`
- reporting widget: current drawer expected amount
- mandatory UI checkpoint:
  - checkout and debt-payment flows visibly update the active cash session state

### Slice 4: Role-ready authorization

- `cashier` can open/close own session within tolerance
- `admin` or `owner` can approve larger discrepancies
- optional per-register assignment rules
- mandatory UI checkpoint:
  - closeout review state + supervisor approval/rejection flow in UI

### Slice 5: Hardening

- request-scoped auth integration
- offline queue for cash events
- E2E against real Supabase
- mandatory UI checkpoint:
  - authenticated operator attribution visible in the UI and real-backend verification flows

---

## Acceptance Criteria for the Feature Plan

- [ ] A register can be opened with an explicit opening float.
- [ ] Only one open session can exist per register.
- [ ] Cash sales and cash debt payments can be reflected in expected cash.
- [ ] Manual cash movements are immutable and attributable to an actor.
- [ ] Closing shows expected amount, counted amount, and discrepancy.
- [ ] The actor model works before and after full login is introduced.
- [ ] Role enforcement can be added without redesigning business tables.

---

## Testing Strategy

### Unit

- `CashRegisterSession` invariants
- discrepancy calculation
- movement direction and expected balance updates
- authorization threshold policy

### Integration

- unique open-session constraint per register
- session + movement persistence
- sale/debt integration into cash ledger
- actor joins through `app_users`

### E2E

- open register -> cash sale -> cash out -> close register
- close with discrepancy inside tolerance
- close with discrepancy requiring supervisor role
- reopen next day after prior close

---

## Risks and Open Questions

- Should the project allow opening float `0` for special cases, or require a positive amount in all human-operated sessions?
- Should closeout be blind by default, or should the operator see expected cash before entering the counted amount?
  - Recommendation: blind by default if the UX remains simple enough.
- Should the next day reuse previous remaining float automatically, or always require a new opening entry?
  - Recommendation: require a new opening entry first; add carry-forward automation later if needed.
- How much offline support is needed for open/close flows in the first release of this feature?
  - Recommendation: online-first for open/close, offline support later.

---

## Decision Summary

Recommended target solution:

- model the drawer as `CashRegister`,
- model the day/shift as `CashRegisterSession`,
- store every cash-affecting action as immutable `CashMovement`,
- introduce `app_users` now and attach `auth_user_id` later,
- pass `ActorContext` to command use cases,
- keep service-role access only for trusted internal jobs, not user-facing command attribution,
- use app-layer authorization with optional Supabase RLS only as a guardrail, never as the place for core cash rules.
