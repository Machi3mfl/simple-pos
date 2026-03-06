# [POS-002] Feature: Cash Register Sessions and Actor Audit Planning

## Metadata

**Feature ID**: `POS-002`
**Status**: `in_progress`
**GitHub Issue**: `TBD`
**Priority**: `high`
**Linked Scope**: `post-MVP operations control`, `actor attribution`, `future roles`, `identity and authorization`, `role-based UI/data protection`, `custom role administration`
**Planning Reference**: `workflow-manager/docs/planning/007-execution-status-simple-pos-ready.md`
**Architecture Artifacts**:
- `workflow-manager/docs/planning/diagrams/class-cash-register-session-domain.md`
- `workflow-manager/docs/planning/diagrams/sequence-cash-register-open-close.md`
- `workflow-manager/docs/planning/diagrams/sequence-identity-and-permission-bootstrap.md`
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

And it should establish one additional foundation:

3. restrictive, role-based UI and data access so senior/non-technical operators can work safely without exposing high-risk admin actions or strategic data by default.

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
- there is no app-level user/role model for future authorization,
- there is no permission model to separate business roles from technical roles,
- the UI shell and API responses are not yet protected by role-based visibility rules.

Important architectural note:

- `workflow-manager/docs/planning/001-requirements-simple-pos-draft.md` mentions "POS session is open" as a precondition in `UC-001`; that precondition is now materially represented by the delivered `Slice 1` cash-register session flow in `/cash-register`, and `Slice 4` now makes that precondition operational by appending automatic cash ledger events from checkout and cash debt-collection flows.

## Implementation Status Snapshot

Delivered so far:

- `Slice 0`:
  - `app_users`, roles, permissions, user-role assignments, role-permission assignments, and register assignments
  - `GET /api/v1/me`, `GET /api/v1/app-users`, `POST/DELETE /api/v1/me/assume-user`
  - operator selector dialog, permission-filtered rail, blocked workspace states, and first protected route checks
- `Slice 1`:
  - `cash_register_sessions` and `cash_movements`
  - `GET /api/v1/cash-registers`
  - `GET /api/v1/cash-registers/{id}/active-session`
  - `POST /api/v1/cash-register-sessions`
  - `POST /api/v1/cash-register-sessions/{id}/close`
  - real `/cash-register` UI checkpoint with register selector, opening float, active-session summary, and counted closeout modal
- `Slice 2`:
  - permission-driven UI and read-model guardrails across `/cash-register`, `/sales`, `/products`, `/receivables`, and `/reporting`
  - `/sales` detail access narrowed to `sales_history.view_all_registers`, while lower-trust operators only keep the summary snapshot
  - `/api/v1/reports/sales-history` now redacts `customer*` fields and `saleItems` when the actor lacks sale-detail permission
  - `/reporting` now degrades to an operational subset for `shift_supervisor`, hiding margin, credit exposure, and inventory-value cards/charts
  - role-aware UI hints now explain restricted workspaces instead of silently omitting strategic data blocks
- `Slice 3`:
  - `POST /api/v1/cash-register-sessions/{id}/movements` for manual `cash_paid_in`, `cash_paid_out`, `safe_drop`, and `adjustment`
  - `GET /api/v1/cash-registers/{id}/active-session` now returns the active-session ledger detail with actor attribution per movement
  - `/cash-register` now includes a movement ledger list plus a modal to register manual cash movements against the open session
  - session expected balance now updates from immutable manual movements before closeout
  - manual movements remain protected by `cash.movement.manual.record`, so lower-trust cashiers keep a read-only drawer view
- `Slice 4`:
  - `POST /api/v1/sales` now appends `cash_sale` automatically when the checkout collects cash into an active register session
  - `POST /api/v1/debt-payments` now appends `debt_payment_cash` automatically when a receivables payment is registered against an active register session
  - `/cash-register` shares the selected drawer with checkout and receivables so the operator sees the expected balance update without leaving the workflow
  - `/receivables` payment modal now shows the active drawer context and expected amount before registering the payment
  - `RecordAutomaticCashMovementUseCase` centralizes these append rules so the ledger stays application-driven instead of relying on SQL side effects
- `Slice 5`:
  - high-discrepancy closeouts now transition to `closing_review_required` instead of closing immediately
  - `POST /api/v1/cash-register-sessions/{id}/approve-closeout` lets `shift_supervisor` and `business_manager` approve a pending closeout through the new `cash.session.close.override_discrepancy` permission
  - `POST /api/v1/cash-register-sessions/{id}/reopen` returns a pending closeout to `open` so the operator can recount without opening a new drawer session
  - the session read model now exposes who submitted the count and who approved the discrepancy, with minimal approval notes for audit context
  - `/cash-register` now shows a review-required state and supervisor approval/reopen flow in the real UI checkpoint
- `Slice 8`:
  - `/login` now provides a real Supabase Auth email/password checkpoint over the existing actor model
  - request actor resolution now reads SSR auth cookies in addition to bearer headers, so browser login works across the same `/api/v1/*` contracts without custom per-screen headers
  - the shell now exposes `Iniciar sesión` / `Cerrar sesión`, and authenticated operators are redirected to the first workspace allowed by their permission snapshot
  - when `POS_ENABLE_ASSUME_USER_BRIDGE` is disabled, `/` now resolves to `/login` instead of silently preferring the temporary drawer preset
- `Slice 9`:
  - `/users-admin` now lets `system_admin` provision or repair real Supabase Auth credentials for existing `app_users`
  - the workspace snapshot now exposes auth credential status (`not_provisioned`, `provisioned`, `stale_mapping`) plus the currently linked email
  - `POST /api/v1/access-control/users/{id}/auth-credentials` now closes the admin workflow for real operator onboarding without test-only helpers
  - a provisioned operator can now be validated immediately through `/login`, using the same permission snapshot and role guards already active across the shell
- `Slice 10`:
  - the temporary bridge no longer sits in the default navigation flow: `/` now lands on `/login`
  - runtime access to workspaces is now credential-first: support bootstrap is no longer exposed from `/login`
- `GET /api/v1/app-users` and `POST /api/v1/me/assume-user` are now restricted to authenticated `system_admin` support flows in runtime and in E2E bootstrap flows
  - support-controlled impersonation now preserves the support controller across assumed operators, so `system_admin` can still switch actors repeatedly after login while validating the resulting UI
  - the rail now clears the assumed-support cookie before returning to `/login`, so real credential login no longer loops back into the delegated session
- `Slice 11`:
  - `/users-admin` now exposes a dedicated `Cajas` tab to maintain the cash-register catalog (`crear`, `editar`, `activar/desactivar`) without opening a new route
  - the user-management modal now persists role and cash-register assignments in a single save action, so operator enablement for `/cash-register` can be solved in one workflow
  - `GET /api/v1/access-control/workspace` now includes `cashRegisters` in the typed snapshot used by the admin workspace
  - new admin contracts:
    - `POST /api/v1/access-control/cash-registers`
    - `PUT /api/v1/access-control/cash-registers/{id}`
    - `PUT /api/v1/access-control/users/{id}/cash-registers`

Still pending:

- making real-credential provisioning the default onboarding path before the support bridge is disabled in production-like environments.

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
- `AuthorizationService` as a core port for role/capability checks,
- `PermissionCode` as the stable authorization primitive,
- roles as named bundles of permission codes instead of the direct source of truth,
- a UI permission snapshot so navigation, components, and data blocks can be protected consistently.

Why this fits:

- the register session owns the lifecycle invariant,
- immutable cash movements make expected balance explainable and auditable,
- the core stays framework-agnostic,
- future role checks stay outside React/Next/Supabase details,
- permission codes let the project evolve role names without rewriting use cases,
- the same permission model can protect both mutation flows and sensitive read surfaces,
- the design scales better than sprinkling free-form `user_name` text fields across tables.

### Explicit Rejections

- Do not put balance calculation in DB triggers or stored procedures.
  - Reason: the project rules explicitly keep business logic in the application core.
- Do not rely on `x-actor-id` headers as the long-term actor model.
  - Reason: headers are fine for mocks, but not for real identity, authorization, or traceability.
- Do not store only `user_name` in business rows.
  - Reason: names change, collide, and cannot support role queries or stable joins.
- Do not hardcode role names directly inside domain rules or ad hoc React conditionals.
  - Reason: role bundles change more often than the underlying permissions.
- Do not treat "hidden button in UI" as authorization.
  - Reason: every protected read/write path must be enforced server-side as well.
- Do not grant `system_admin` every business capability by default.
  - Reason: platform support and commercial approval are different responsibilities and should stay separable.
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
    - `permissionCodes`
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

create table permissions (
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

create table role_permission_assignments (
  id text primary key,
  role_id text not null references roles(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  unique (role_id, permission_id)
);

create table cash_register_user_assignments (
  id text primary key,
  cash_register_id text not null references cash_registers(id) on delete cascade,
  user_id text not null references app_users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by_user_id text references app_users(id),
  unique (cash_register_id, user_id)
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

### Recommended Role Bundles

Design principle:

- keep the underlying authorization model capability-based,
- expose only a small set of understandable business roles in the UI/admin layer,
- make `cajero` the safest default role for older operators,
- treat the starting roles below as seed presets, not as the final immutable catalog for every business.

Recommended starting role set:

| Role code | Primary purpose | Main access | Explicit restrictions |
| --- | --- | --- | --- |
| `cashier` | Day-to-day POS checkout | `/cash-register`, assigned drawer/session, limited `/sales` snapshot | no product mutations, no price updates, no strategic reporting, no user admin, no discrepancy override |
| `collections_clerk` | Debt collection and customer balance follow-up | `/receivables`, debt payment registration, debtor detail | no product/catalog changes, no cash-session close approval, no strategic reporting |
| `shift_supervisor` | Operational control of the shift | cash session open/close, manual cash movements, `/sales`, operational receivables, discrepancy approval within policy | no technical admin, no broad platform config |
| `catalog_manager` | Products, sourcing, stock, and pricing | `/products`, `/products/sourcing`, bulk imports, stock adjustments, price updates | no cash close approval, no receivables settlement, no user admin |
| `business_manager` | Cross-functional commercial/financial management | all business workspaces, strategic reporting, user-role assignment for business roles | no low-level platform secrets unless also granted technical role |
| `executive_readonly` | CEO/owner visibility without mutation risk | `/sales`, `/receivables`, `/reporting` in read-only mode | no operational mutations, no catalog edits, no cash movements |
| `system_admin` | Technical platform support | user provisioning, support tools, audit access, environment/integration administration | should not mutate commercial data or approve drawer discrepancies unless separately assigned a business role |
| `service_account` | Non-human automation | injector, offline sync, migrations, internal jobs | never used as an interactive UI role |

If the business wants a smaller first rollout, the minimum recommended bundles are:

- `cashier`
- `shift_supervisor`
- `business_manager`
- `executive_readonly`
- `system_admin`

Then split `collections_clerk` and `catalog_manager` only when workload specialization appears.

### Recommended Permission Codes

Permission examples that should exist independently of role names:

- `checkout.sale.create`
- `cash.session.open`
- `cash.session.close`
- `cash.session.close.override_discrepancy`
- `cash.movement.manual.record`
- `sales_history.view`
- `sales_history.view_all_registers`
- `receivables.view`
- `receivables.payment.register`
- `receivables.notes.view`
- `products.view`
- `products.create_from_sourcing`
- `products.update_price`
- `inventory.adjust_stock`
- `inventory.bulk_import`
- `inventory.cost.view`
- `inventory.value.view`
- `reporting.operational.view`
- `reporting.executive.view`
- `reporting.margin.view`
- `reporting.credit_exposure.view`
- `users.manage`
- `roles.assign`
- `audit.view`
- `system.support.override`

Recommendation:

- use roles only as curated bundles for humans,
- let use cases and API handlers check permission codes,
- let UI render from a permission snapshot, not from hardcoded role names.

### Future Role Administration Strategy

The delivered authorization foundation should evolve into a configurable role catalog, not stay limited to the initial seed bundles.

Target operating model:

- `permissions` remain the stable atomic source of truth,
- seeded roles such as `cashier`, `shift_supervisor`, and `business_manager` remain available as safe defaults,
- `system_admin` can create business-specific roles by combining existing permissions,
- user-facing UI and API guards continue checking effective permission codes, never role names,
- custom roles can be introduced without rewriting domain/application logic.

Guardrails required for that future UI:

- distinguish `system roles` from `custom roles`,
- system roles should be locked or clone-only so the business always has a recoverable baseline,
- prevent self-lockout for the currently acting `system_admin`,
- audit every role creation, update, deactivation, and assignment change,
- group permissions by domain in the UI so the catalog stays understandable for non-technical operators.

Recommended permission groups for the future role composer UI:

- `cash_register`
- `checkout`
- `cash_movements`
- `sales_history`
- `receivables`
- `products`
- `product_sourcing`
- `reporting`
- `user_admin`
- `role_admin`

### UI and Data Protection Strategy

The protection model must exist at four layers at the same time:

1. navigation guard
   - the side rail shows only modules the actor can access.
2. page guard
   - direct URL access must still return a protected empty state or `403` equivalent if the actor lacks the required permission.
3. component/action guard
   - dangerous buttons, bulk actions, closeout approvals, and financial fields are hidden or read-only according to permission.
4. server-side data projection
   - list/detail endpoints return only the fields the actor is allowed to see.

Recommended UI/data rules by workspace:

- `/cash-register`
  - `cashier`: visible
  - sees current drawer state, catalog, cart, and own checkout actions
  - does not see cost, profit, or user-management controls
- `/sales`
  - `cashier`: optional limited view to own shift/register
  - `shift_supervisor`, `business_manager`, `executive_readonly`: full store snapshot
  - sale detail should not expose mutation controls unless explicitly permitted
- `/products`
  - only `catalog_manager` and `business_manager` should see create/edit/price/stock actions
  - `cashier` should not see this workspace at all
- `/receivables`
  - `collections_clerk`, `business_manager`, and optionally `shift_supervisor`
  - `executive_readonly` may see debtor aggregates and balances but not payment-registration controls
- `/reporting`
  - `business_manager` and `executive_readonly` full
  - `shift_supervisor` can optionally get an operational subset
  - `cashier` should not see strategic profit/margin/credit exposure by default

Sensitive data categories that require explicit permission:

- inventory cost and gross margin,
- customer-level debt notes and ledger detail,
- drawer discrepancies and manual cash adjustments,
- user/role assignments,
- technical support overrides and audit metadata.

### UX Safety Rule for Older Operators

Because the system is intended for operators who may be older or non-technical:

- default login/actor assignment should land `cashier` users directly in `/cash-register`,
- modules outside the operator's job should disappear from the rail entirely,
- destructive or high-risk actions must never be only one click away,
- discrepancy approvals, bulk imports, and pricing actions must require higher-trust roles,
- strategic dashboards should stay readable and available to leadership without exposing mutation controls.

### Recommended Application Types

```ts
export interface ActorContext {
  readonly actorId: string;
  readonly actorKind: "human" | "system";
  readonly roleCodes: readonly string[];
  readonly permissionCodes: readonly string[];
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

### Implemented in Slice 0 and Slice 1

- `GET /api/v1/me`
- `POST /api/v1/me/assume-user`
- `DELETE /api/v1/me/assume-user`
- `GET /api/v1/app-users?role=...`
- `GET /api/v1/cash-registers`
- `GET /api/v1/cash-registers/{id}/active-session`
- `POST /api/v1/cash-register-sessions`
- `POST /api/v1/cash-register-sessions/{id}/close`

### Planned Next Endpoints

- `POST /api/v1/cash-registers`
- `POST /api/v1/cash-register-sessions/{id}/movements`
- `GET /api/v1/cash-register-sessions?registerId=...&status=...&dateFrom=...&dateTo=...`
- `GET /api/v1/permissions`
- `GET /api/v1/roles`
- `POST /api/v1/roles`
- `PATCH /api/v1/roles/{id}`
- `POST /api/v1/user-role-assignments`

### Command Examples

Open a register:

```bash
curl -X POST /api/v1/cash-register-sessions \
  -H "content-type: application/json" \
  -d '{
    "cashRegisterId": "front-counter",
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

## Slice 0 Implementable Design

### Slice 0 Goal

`Slice 0` must leave the project with a minimal but real identity-and-authorization loop that is already testable from the UI before session cash logic is added.

Current implementation status:

- migration `20260303130000_access_control_slice_zero.sql` now creates `app_users` and seeds only the base authorization catalog (`roles`, `permissions`, `role_permission_assignments`); demo operators are provisioned by the injector,
- `GET /api/v1/me`, `GET /api/v1/app-users`, `POST /api/v1/me/assume-user`, and `DELETE /api/v1/me/assume-user` are live,
- the shell now renders a real `Seleccionar operador` modal plus operator context in the rail,
- navigation and direct workspace access are filtered from `permissionSnapshot`,
- critical write/read routes now enforce permission checks server-side,
- the first protected read-model downgrades are already in place:
  - receivables ledger notes are removed without `receivables.notes.view`,
  - inventory cost is zeroed without `inventory.cost.view`,
  - reporting can still access an inventory summary without opening the full products workspace.

That means shipping all of the following together:

- real persistence for app users, roles, permissions, and drawer assignments,
- a real `GET /api/v1/me` contract that returns identity plus permission snapshot,
- a temporary but safe operator-selection bridge before full authentication is enforced,
- shell/UI guards that visibly react to the permission snapshot,
- blocked workspace states so permission decisions can be demoed end-to-end.

### Slice 0 Implementation Boundary

Included in `Slice 0`:

- `app_users`
- `roles`
- `permissions`
- `user_role_assignments`
- `role_permission_assignments`
- `cash_register_user_assignments`
- request actor resolution bridge
- `GET /api/v1/me`
- permission-aware shell filtering
- protected workspace empty/blocked states

Explicitly excluded from `Slice 0`:

- full Supabase-auth login enforcement
- cash-session open/close commands
- manual cash movement commands
- supervisor discrepancy approval
- offline cash-event queue

### Slice 0 Persistence Decisions

Implementation recommendation:

1. migration `A`
   - create `app_users`, `roles`, `permissions`, `user_role_assignments`, `role_permission_assignments`, `cash_register_user_assignments`
2. migration `B`
   - seed the initial role bundles and permission catalog
3. migration `C`
   - seed at least:
     - one `cash_register`
     - one `cashier`
     - one `shift_supervisor`
     - one `business_manager`
     - one `executive_readonly`
     - one `system_admin`

Important implementation rule:

- do not create a database-side "effective permissions" function,
- calculate effective permissions in the application layer so the same logic is reused by API handlers and UI projection builders.

### Temporary Identity Bridge Before Full Auth

Because the project still lacks a fully enforced login boundary for user-facing requests, `Slice 0` should introduce a temporary operator bridge that is still compatible with the future auth model.

Recommended design:

- `POST /api/v1/me/assume-user`
  - body receives `userId`
  - server validates the user is active
  - server sets an `httpOnly` signed cookie such as `actor_session`
- `DELETE /api/v1/me/assume-user`
  - clears the temporary cookie
- `GET /api/v1/me`
  - resolves the actor from:
    1. authenticated `auth_user_id` mapping when available later,
    2. otherwise the temporary signed actor cookie in the bridge phase

Why this is the recommended bridge:

- it gives a real UI workflow before login hardening is complete,
- it avoids fragile `localStorage`-only identity,
- it keeps the use-case input stable because the application still receives `ActorContext`,
- it can be disabled once full auth becomes mandatory.

Environment rule:

- the `assume-user` bridge must be enabled only while the system is still in the pre-auth rollout phase or behind an explicit support flag.

### Slice 0 DTO and Contract Proposal

#### `POST /api/v1/me/assume-user`

Request DTO:

```ts
export interface AssumeUserSessionRequestDto {
  readonly userId: string;
}
```

Response DTO:

```ts
export interface AssumeUserSessionResponseDto {
  readonly actorId: string;
  readonly displayName: string;
  readonly roleCodes: readonly string[];
}
```

#### `GET /api/v1/me`

Recommended single-contract approach:

- return identity and permission snapshot in one payload,
- do not split `/me` and `/me/permissions` in the first slice unless payload size becomes a real issue.

Response DTO:

```ts
export interface GetMeResponseDto {
  readonly actor: {
    readonly actorId: string;
    readonly displayName: string;
    readonly actorKind: "human" | "system";
    readonly roleCodes: readonly string[];
    readonly assignedRegisterIds: readonly string[];
  };
  readonly permissionSnapshot: PermissionSnapshotDto;
}

export interface PermissionSnapshotDto {
  readonly permissionCodes: readonly string[];
  readonly navigation: NavigationAccessDto;
  readonly workspaces: WorkspaceAccessDto;
  readonly dataVisibility: DataVisibilityDto;
}

export interface NavigationAccessDto {
  readonly cashRegister: boolean;
  readonly sales: boolean;
  readonly receivables: boolean;
  readonly products: boolean;
  readonly reporting: boolean;
  readonly usersAdmin: boolean;
}

export interface WorkspaceAccessDto {
  readonly cashRegister: {
    readonly canView: boolean;
    readonly canCreateSale: boolean;
    readonly canOpenSession: boolean;
    readonly canCloseSession: boolean;
    readonly canRecordManualCashMovement: boolean;
  };
  readonly sales: {
    readonly canView: boolean;
    readonly canViewAllRegisters: boolean;
    readonly canViewSaleDetail: boolean;
  };
  readonly receivables: {
    readonly canView: boolean;
    readonly canRegisterPayment: boolean;
    readonly canViewSensitiveNotes: boolean;
  };
  readonly products: {
    readonly canView: boolean;
    readonly canCreateFromSourcing: boolean;
    readonly canUpdatePrice: boolean;
    readonly canAdjustStock: boolean;
    readonly canRunBulkImport: boolean;
  };
  readonly reporting: {
    readonly canView: boolean;
    readonly canViewExecutiveMetrics: boolean;
    readonly canViewMargin: boolean;
    readonly canViewInventoryValue: boolean;
    readonly canViewCreditExposure: boolean;
  };
  readonly usersAdmin: {
    readonly canView: boolean;
    readonly canAssignRoles: boolean;
    readonly canManageUsers: boolean;
  };
}

export interface DataVisibilityDto {
  readonly salesScope: "none" | "own_register" | "assigned_registers" | "store";
  readonly receivablesScope: "none" | "summary_only" | "full";
  readonly canViewInventoryCost: boolean;
  readonly canViewProfitMetrics: boolean;
  readonly canViewAuditMetadata: boolean;
}
```

`GET /api/v1/me` example:

```json
{
  "actor": {
    "actorId": "user_cashier_01",
    "displayName": "Putri",
    "actorKind": "human",
    "roleCodes": ["cashier"],
    "assignedRegisterIds": ["front-counter"]
  },
  "permissionSnapshot": {
    "permissionCodes": [
      "checkout.sale.create",
      "cash.session.open",
      "cash.session.close"
    ],
    "navigation": {
      "cashRegister": true,
      "sales": true,
      "receivables": false,
      "products": false,
      "reporting": false,
      "usersAdmin": false
    },
    "workspaces": {
      "cashRegister": {
        "canView": true,
        "canCreateSale": true,
        "canOpenSession": true,
        "canCloseSession": true,
        "canRecordManualCashMovement": false
      },
      "sales": {
        "canView": true,
        "canViewAllRegisters": false,
        "canViewSaleDetail": true
      },
      "receivables": {
        "canView": false,
        "canRegisterPayment": false,
        "canViewSensitiveNotes": false
      },
      "products": {
        "canView": false,
        "canCreateFromSourcing": false,
        "canUpdatePrice": false,
        "canAdjustStock": false,
        "canRunBulkImport": false
      },
      "reporting": {
        "canView": false,
        "canViewExecutiveMetrics": false,
        "canViewMargin": false,
        "canViewInventoryValue": false,
        "canViewCreditExposure": false
      },
      "usersAdmin": {
        "canView": false,
        "canAssignRoles": false,
        "canManageUsers": false
      }
    },
    "dataVisibility": {
      "salesScope": "own_register",
      "receivablesScope": "none",
      "canViewInventoryCost": false,
      "canViewProfitMetrics": false,
      "canViewAuditMetadata": false
    }
  }
}
```

### Initial Permission Snapshot Rules

The snapshot should be built by a dedicated application service such as:

```ts
export interface BuildPermissionSnapshotUseCase {
  execute(input: { readonly actorId: string }): Promise<PermissionSnapshotDto>;
}
```

Recommended build order:

1. load `app_user`
2. load active role assignments
3. load permissions through `role_permission_assignments`
4. load register assignments
5. derive workspace booleans and visibility scopes
6. return one stable UI-ready snapshot

Recommendation:

- derive booleans for UI ergonomics,
- keep raw `permissionCodes` in the payload as the stable debug/audit source,
- treat `navigation`, `workspaces`, and `dataVisibility` as derived projections.

### Initial Permission Matrix by Screen

#### Access Level Matrix

| Screen | `cashier` | `collections_clerk` | `shift_supervisor` | `catalog_manager` | `business_manager` | `executive_readonly` | `system_admin` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/cash-register` | full | hidden | full | hidden | full | hidden | limited support only |
| `/sales` | limited own register/shift | hidden | full | hidden | full | read-only full | limited support only |
| `/receivables` | hidden | full | operational subset | hidden | full | read-only aggregate/detail subset | limited support only |
| `/products` | hidden | hidden | hidden by default | full | full | hidden | limited support only |
| `/reporting` | hidden | hidden | operational subset only | hidden | full | read-only full | limited support only |
| `/admin/users` | hidden | hidden | hidden | hidden | optional assign-business-roles only | hidden | full |

Interpretation rules:

- `hidden` means the rail entry is removed and direct access must show blocked state,
- `limited` means the screen exists but data scope or controls are reduced,
- `read-only` means metrics/detail may be visible but mutation controls must be absent,
- `limited support only` means technical support surfaces may exist later, but business screens should not be treated as implicitly authorized.

#### Screen-to-Permission Matrix

| Screen | Base visibility permission | Mutation permissions | Sensitive data permissions |
| --- | --- | --- | --- |
| `/cash-register` | `checkout.sale.create` | `cash.session.open`, `cash.session.close`, `cash.movement.manual.record` | none in Slice 0 |
| `/sales` | `sales_history.view` | none in current design | `sales_history.view_all_registers` |
| `/receivables` | `receivables.view` | `receivables.payment.register` | `receivables.notes.view` |
| `/products` | `products.view` | `products.create_from_sourcing`, `products.update_price`, `inventory.adjust_stock`, `inventory.bulk_import` | `inventory.cost.view` |
| `/reporting` | `reporting.executive.view` or `reporting.operational.view` | none | `reporting.margin.view`, `reporting.credit_exposure.view`, `inventory.value.view` |
| `/admin/users` | `users.manage` | `roles.assign` | `audit.view` |

### Slice 0 UI Checkpoint Design

Because every slice must be demoable from UI before broader use-case expansion, `Slice 0` should ship a small but real operator-access flow.

#### Required UI surfaces

1. operator selection surface
   - large-button modal or page shown when there is no current actor
   - lists active operators by display name and primary role label
   - optimized for non-technical users with large touch targets
2. shell actor summary
   - header or side-rail area showing current operator, role badge, and assigned register
3. permission-aware navigation
   - only render modules allowed by `permissionSnapshot.navigation`
4. blocked workspace state
   - direct navigation to a forbidden route shows a deliberate "Sin acceso" state instead of empty broken content
5. optional admin/support access preview
   - a lightweight internal screen or modal where higher-trust users can inspect the current raw permission codes during rollout

#### Recommended first UI to build

The first `Slice 0` UI should be:

- `Seleccionar operador` modal/page on app start,
- plus permission-filtered rail,
- plus blocked state cards in `/products`, `/receivables`, `/reporting`, and `/sales`.

This gives the team a fully visible workflow to verify:

- operator identity selection,
- permission snapshot creation,
- navigation filtering,
- route protection,
- data-visibility downgrades.

### Slice 0 Testable Workflow

Minimum end-to-end story for the first implementation:

1. open app with no actor
2. choose `cashier`
3. `GET /api/v1/me` returns `cashier` snapshot
4. shell shows only `Caja` and the limited `Ventas` entry if enabled
5. deep link to `/products` shows blocked state
6. switch actor to `business_manager`
7. `GET /api/v1/me` now returns expanded snapshot
8. shell reveals `/products`, `/receivables`, `/reporting`
9. strategic metrics become visible while cashier-only restrictions disappear

### Slice 0 E2E and Review Gate

Completed gate before moving into `Slice 1`:

- operator selection changes the effective actor,
- `/api/v1/me` changes accordingly,
- the rail updates without manual reload hacks,
- forbidden routes render blocked states,
- executive/business views expose more data than cashier views,
- raw permission codes can be inspected from a support-friendly UI during rollout.

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
- each slice should be independently testable before starting the next one,
- if a slice does not yet have a natural end-user screen, ship a support/admin-facing UI checkpoint in the same batch so the workflow can still be exercised visually.

### Slice 0: Identity, actor, and permission foundation

- `app_users`, roles, permissions, role-permission assignments
- register/operator assignment support
- `GET /api/v1/me` + permission snapshot
- `POST /api/v1/me/assume-user` bridge until full auth hardening replaces it
- request actor resolution bridge before full auth hardening
- mandatory UI checkpoint:
  - current operator selection flow visible in UI
  - current operator context visible in shell
  - rail/navigation filtered by permission snapshot
  - protected workspaces render safe empty/blocked states when accessed without permission

### Slice 1: Register session core

- create register catalog
- open session
- show active session
- close session with expected vs counted
- no denomination breakdown required yet
- mandatory UI checkpoint:
  - register selector + open-session form + active-session summary + close-session form

### Slice 1 E2E and Review Gate

Before starting `Slice 2`, the team should be able to demo all of these live:

- `/cash-register` shows only registers accessible to the selected operator,
- opening a session immediately creates an active-session summary on the same screen,
- trying to open the same register twice returns a conflict instead of corrupting state,
- active-session lookup can be queried through the real API,
- closing stores counted cash and discrepancy and returns the workspace to the pre-open state.

### Slice 2: UI and data guardrails across existing workspaces

Current implementation status:

- `/sales`
  - `cashier` can keep a list-level operational snapshot but cannot open the sale-detail modal
  - `collections_clerk` no longer sees `/sales` in the rail
  - server projection now strips `customerId`, `customerName`, and `saleItems` unless `sales_history.view_all_registers` is present
- `/reporting`
  - `shift_supervisor` now gets an operational read-only subset backed by `reporting.operational.view`
  - margin, credit exposure, and inventory-value metrics stay hidden without the corresponding strategic permissions
  - the UI renders an explicit restricted-state hint so the operator understands why some blocks are absent
- `/products`, `/receivables`, and `/cash-register`
  - previous role-based blocked states remain in force and now share the same permission snapshot semantics used by `/sales` and `/reporting`

Completed UI checkpoint:

- `cashier` sees only operational surfaces and a summary-only `/sales`
- `shift_supervisor` can inspect operational reporting without strategic metrics
- `executive_readonly` still sees read-only strategic and financial views
- product/admin controls disappear for non-authorized operators

### Slice 3: Cash movement ledger

Current implementation status:

- manual `cash_paid_in`, `cash_paid_out`, `safe_drop`, and `adjustment` commands are live
- `GET /api/v1/cash-registers/{id}/active-session` now projects the full movement list for the open session
- session expected balance updates immediately when a manual movement is recorded
- `/cash-register` now renders:
  - active-session movement list
  - movement modal/form
  - updated expected balance after each movement
- movement attribution now includes `performedByUserId` and `performedByDisplayName`
- the operator can add notes, while the system still persists the movement type as a stable reason code

Completed UI checkpoint:

- active-session movement list + add-movement modal/form + updated expected balance view

### Slice 4: Automatic integrations

Current implementation status:

- `POST /api/v1/sales` automatically records `cash_sale` when cash is collected against the selected active drawer
- partial cash collected during `on_account` checkout also records `cash_sale` for the paid amount, while the remainder stays in receivables
- `POST /api/v1/debt-payments` automatically records `debt_payment_cash` when the payment is tied to the selected active drawer
- automatic cash recording resolves the active drawer through the selected register or the actor's single assigned drawer, and returns a conflict when the drawer context is ambiguous or closed
- `/cash-register` now refreshes the active-session summary after checkout and after receivables payments
- `/receivables` now surfaces the active drawer name and expected amount before registering a payment, keeping notes support intact

Completed UI checkpoint:

- checkout and debt-payment flows visibly update the active cash session state
- the receivables payment modal exposes drawer context before the operator confirms the payment

### Slice 5: Discrepancy approval and business authorization

- `cashier` can open/close own session within tolerance
- `shift_supervisor` or `business_manager` can approve larger discrepancies
- `system_admin` alone should not approve business discrepancies unless also assigned the right business permission
- optional per-register assignment rules
- mandatory UI checkpoint:
  - closeout review state + supervisor approval/rejection flow in UI

Delivered checkpoint:

- discrepancy tolerance is centralized in application policy and currently defaults to a small operational threshold until per-register configuration exists
- closeout above tolerance now lands in `closing_review_required` with `closeoutSubmitted*` metadata instead of silently closing
- supervisor-capable actors approve through `POST /api/v1/cash-register-sessions/{id}/approve-closeout`
- higher-trust actors can also send the closeout back to recount through `POST /api/v1/cash-register-sessions/{id}/reopen`
- `/cash-register` now renders the review-required state with submitted count, difference, approval CTA, and reopen-for-recount CTA

### Slice 6: Role catalog and permission composition UI

Why this slice belongs here:

- `Slice 0` through `Slice 5` stabilize the real permission vocabulary of the product,
- `Slice 4` and `Slice 5` still add sensitive permissions around automatic cash events and discrepancy approval,
- adding a role-composer UI earlier would force repeated changes to presets, permission grouping, and admin screens,
- postponing it until after hardening would delay business validation unnecessarily even though the current `assume-user` bridge already supports a real UI checkpoint.

Lowest-cost insertion point:

- place the role-administration slice after `Slice 5` and before auth hardening,
- that way the permission catalog is mature enough for business configuration,
- but the team can still validate the whole workflow visually before replacing the bridge with final authentication wiring.

Scope:

- custom role CRUD for `system_admin`
- locked seed/system roles with clone-from-preset support
- permission-group based role composer UI
- user-to-role assignment UI using the same effective-permission model already delivered in `Slice 0`
- audit metadata for role mutations and assignments

Mandatory UI checkpoint:

- `system_admin` can open an access-control screen,
- clone a preset role,
- enable/disable permission groups or individual permissions,
- assign the resulting role to a user,
- switch operator and immediately observe rail, page, component, and data changes through the existing `/api/v1/me` snapshot.

Implemented result:

- `/users-admin` now exists as a protected workspace inside the same POS shell,
- `GET /api/v1/access-control/workspace` returns the live role catalog, permission catalog, permission groups, and current user-role assignments,
- `POST /api/v1/access-control/roles` creates custom roles from cloned or blank bundles,
- `PUT /api/v1/access-control/roles/{id}` edits only mutable custom roles,
- `DELETE /api/v1/access-control/roles/{id}` removes only mutable custom roles without remaining assignments,
- `PUT /api/v1/access-control/users/{id}/roles` replaces user-role assignments through the same effective-permission model already used by `/api/v1/me`,
- seed roles are now marked as locked system presets and can only be adapted through cloning,
- `roles.manage` was added as the explicit capability for role-catalog CRUD,
- self-lockout guardrails now prevent the acting admin from removing the last role-management capability from themself,
- the admin UI exposes the required real checkpoint: role catalog, permission composer, user assignment, and immediate operator switch to verify the result visually.

### Slice 7: Hardening

- request-scoped auth integration
- offline queue for cash events
- E2E against real Supabase
- mandatory UI checkpoint:
  - authenticated operator attribution visible in the UI and real-backend verification flows

Implemented result:

- `GET /api/v1/me` now exposes a `session` block with `resolutionSource`, `authUserId`, `canAssumeUserBridge`, and `supportControllerActorId`,
- request actor resolution now prefers a validated Supabase bearer token mapped through `app_users.auth_user_id`,
- authenticated-but-unmapped requests no longer fall back to the default business actor; they degrade to an empty permission snapshot instead,
- `POST /api/v1/me/assume-user` and `DELETE /api/v1/me/assume-user` are now gated by `POS_ENABLE_ASSUME_USER_BRIDGE`, while local build/test runs still keep the bridge available unless the environment marks a real production deployment,
- the shell now surfaces the attribution mode directly in the rail (`Login verificado`, `Sesión delegada`, or `Sin sesión`),
- manual cash movements can now be queued offline from `/cash-register`,
- retrying sync from `/cash-register` replays `cash_movement_recorded` into the real cash ledger and refreshes the active-session detail after success,
- opening and closing a register remain online-first as previously recommended; the hardening slice only adds offline support for manual cash events.

### Slice 8: Real login UI checkpoint

- `/login` now renders a real operator-facing email/password flow backed by Supabase Auth,
- browser sign-in/sign-out now works against the existing `app_users.auth_user_id` mapping without inventing a second identity model,
- request actor resolution now accepts authenticated SSR cookies as a first-class source, while bearer tokens still keep precedence for tests and explicit API clients,
- the shell now shows `Iniciar sesión` when operating under the temporary preset/bridge and `Cerrar sesión` once the operator is authenticated,
- successful login redirects the operator to the first workspace allowed by the permission snapshot, so `cashier` lands directly in `/cash-register`,
- logout clears both the Supabase auth session and any leftover assumed-user cookie before returning to `/login`.
- logout now enters an explicit "signing out" UI state so the shell does not flash `WorkspaceBlockedState` between session teardown and `/login` redirect.

Completed UI checkpoint:

- real login page -> authenticated workspace redirect -> logout back to `/login`

### Slice 9: Real credential provisioning for `app_users`

- `/users-admin` now includes a real credential block inside the selected-user panel, so `system_admin` can create or update the Supabase Auth login for an existing business operator without leaving the workspace,
- the access-control workspace snapshot now exposes `authCredentialStatus`, `authEmail`, and `authUserId` so the UI can surface missing vs stale mappings directly,
- `POST /api/v1/access-control/users/{id}/auth-credentials` is now the server-enforced contract for provisioning or repairing credentials under `users.manage`,
- the flow is intentionally UI-first: choose a business user, provision access, then validate the resulting role bundle immediately through `/login`.

Completed UI checkpoint:

- `/users-admin` credential provisioning -> `/login` with the provisioned user -> redirect to the first permitted workspace

### Slice 10: Auth-required runtime with controlled support delegation

- `/` now lands on `/login` even when the bridge is enabled, so the normal operator path starts with real credentials instead of the legacy preset,
- `/login` no longer exposes a public support CTA; all operator and support entry starts from real credentials,
- runtime workspace pages now redirect to `/login` unless a real authenticated session exists,
- `GET /api/v1/app-users` is now support-only, and `POST /api/v1/me/assume-user` only accepts authenticated support-capable sessions in runtime,
- support-controlled impersonation now carries `supportControllerActorId` in the request/session snapshot so the UI can keep changing actors without losing the support context,
- the shell `Iniciar sesión` action now clears the assumed-support cookie before returning to `/login`, preventing accidental redirect loops back into the impersonated operator,
- the demo injector now reconciles the local auth users manifest and signs protected writes as the provisioned `system_admin`, so local demo data can still be regenerated after login hardening.
- Playwright now provisions demo auth users in `globalSetup` and boots with real authenticated fixtures by default, removing `POS_ALLOW_GUEST_WORKSPACES` from the E2E webServer command.

Completed UI checkpoint:

- `/login` real sign-in path -> `system_admin` switches operator from the rail -> clear delegated session back to `/login`

---

## Acceptance Criteria for the Feature Plan

- [ ] A register can be opened with an explicit opening float.
- [ ] Only one open session can exist per register.
- [ ] Cash sales and cash debt payments can be reflected in expected cash.
- [x] Manual cash movements are immutable and attributable to an actor.
- [x] Closing shows expected amount, counted amount, and discrepancy.
- [x] The actor model works before and after full login is introduced.
- [x] Role enforcement can be added without redesigning business tables.
- [x] Roles are implemented as bundles of permission codes, not as hardcoded UI conditionals.
- [x] `GET /api/v1/me` returns a stable permission snapshot usable directly by the shell/UI.
- [x] The temporary pre-auth actor bridge is testable from a real UI without resorting to developer-only local storage hacks.
- [x] The same permission snapshot can now be reached through a real login/logout browser flow backed by Supabase Auth.
- [x] `system_admin` can provision or repair real login credentials for `app_users` from the admin UI.
- [x] The temporary bridge is now explicit support-only UI instead of the default operator entry path.
- [x] UI navigation, components, and data blocks are protected by the same permission model.
- [x] Strategic metrics and sensitive financial fields are hidden from operational roles by default.
- [x] Sales history detail is server-redacted unless the actor has the explicit sale-detail permission.
- [x] Operational reporting can be exposed to supervisors without leaking margin, credit exposure, or stock-value data.
- [x] High-discrepancy closeouts require higher-trust approval or a recount flow instead of silently closing.
- [x] `system_admin` can create and assign custom roles as bundles of existing permission codes without code changes.

---

## Testing Strategy

### Unit

- `CashRegisterSession` invariants
- discrepancy calculation
- movement direction and expected balance updates
- authorization threshold policy
- permission evaluation policy
- data projection policy for protected read models

### Integration

- unique open-session constraint per register
- session + movement persistence
- sale/debt integration into cash ledger
- actor joins through `app_users`
- role-permission joins
- register/user assignment enforcement
- protected API responses by permission scope

### E2E

- operator selection -> `GET /api/v1/me` -> permission-filtered shell
- blocked direct access to unauthorized workspace
- operational `/sales` snapshot without sale-detail access
- operational `/reporting` subset without strategic metrics
- open session -> record manual movement -> updated expected balance in UI and API
- open register -> cash sale -> cash out -> close register
- close with discrepancy inside tolerance
- close with discrepancy requiring supervisor role
- reopen next day after prior close
- `cashier` cannot see `/products` or `/reporting`
- `executive_readonly` can open `/reporting` and `/sales` but cannot mutate anything
- `catalog_manager` can manage products but cannot approve cash discrepancies
- `system_admin` can clone a preset role, change permissions, assign it, and verify the resulting permission snapshot from a real UI flow
- `system_admin` can create, update, and delete custom roles without mutating locked seed presets

---

## Risks and Open Questions

- Should the project allow opening float `0` for special cases, or require a positive amount in all human-operated sessions?
- Should closeout be blind by default, or should the operator see expected cash before entering the counted amount?
  - Recommendation: blind by default if the UX remains simple enough.
- Should the next day reuse previous remaining float automatically, or always require a new opening entry?
  - Recommendation: require a new opening entry first; add carry-forward automation later if needed.
- How much offline support is needed for open/close flows in the first release of this feature?
  - Recommendation: online-first for open/close, offline support later.
- Should the first rollout allow one user to hold multiple business roles, or should the UI assume one primary role per shift?
  - Recommendation: support multiple role assignments in the model, but compute one simple permission snapshot for the UI.
- Should `executive_readonly` be allowed to see customer-level debt detail or only aggregates?
  - Recommendation: start with aggregate + limited drill-down, keep sensitive notes/payment actions hidden.
- How strict should cashier visibility be for the sales-history workspace?
  - Recommendation: same-register or same-shift visibility only unless explicitly elevated.

---

## Decision Summary

Recommended target solution:

- model the drawer as `CashRegister`,
- model the day/shift as `CashRegisterSession`,
- store every cash-affecting action as immutable `CashMovement`,
- introduce `app_users` now and attach `auth_user_id` later,
- introduce roles as business-facing bundles over stable permission codes,
- pass `ActorContext` to command use cases,
- keep service-role access only for trusted internal jobs, not user-facing command attribution,
- protect navigation, components, and data responses with the same authorization source,
- separate `business_manager` / `executive_readonly` from `system_admin` so strategic visibility and technical administration are not conflated,
- treat seeded roles as safe starter presets while allowing a later `system_admin` role-composer UI to adapt business bundles without changing code,
- use app-layer authorization with optional Supabase RLS only as a guardrail, never as the place for core cash rules.
