# Execution Status: simple-pos

## Document Metadata

**Document ID**: `007`  
**File Name**: `007-execution-status-simple-pos-ready.md`  
**Status**: `done`
**GitHub Issue**: #18  
**Owner**: `project-owner`  
**Author**: `maxi`  
**Version**: `0.4`
**Created At**: `2026-03-01`  
**Last Updated**: `2026-03-04`
**Source Docs**: `001`, `002`, `003`, `004`, `005`, `006`  

---

> Closure note: this snapshot records the completed MVP execution state as of `2026-03-01`, plus the post-MVP planning items later opened for external product sourcing and cash-register/actor-audit planning.

## 1. Iteration Status

| Iteration | Scope | Status | Evidence |
| --- | --- | --- | --- |
| Iteration 0 | Architecture artifacts + OpenAPI baseline | done | TASK-001, TASK-002, TASK-003 |
| Iteration 1 | Tablet POS UI + checkout rules + mock E2E | done | TASK-004, TASK-005, TASK-006 |
| Iteration 2 | Contracts + mock runtime | done | API-001 + contract and mock E2E suites |
| Iteration 3 | Catalog + inventory + bulk repricing | done | CATALOG-001, INVENTORY-001 |
| Iteration 4 | On-account debt and payments | done | AR-001 + UI/API/E2E debt flows |
| Iteration 5 | Offline capture and sync | done | OFFLINE-001 + offline recovery E2E |
| Iteration 6 | Reporting + release gate real backend | done | RELEASE-001 + real-backend suites |

---

## 2. Feature Status

| Feature | Status |
| --- | --- |
| POS-001 | done |
| POS-002 | in_progress |
| API-001 | done |
| CATALOG-001 | done |
| INVENTORY-001 | done |
| PRODUCTS-001 | done |
| PRODUCTS-002 | done |
| PRODUCTS-003 | done |
| SOURCING-001 | done |
| AR-001 | done |
| OFFLINE-001 | done |
| RELEASE-001 | done |
| I18N-001 | done |

---

## 3. Task Status

| Task | Status | Notes |
| --- | --- | --- |
| TASK-001 | done | Diagram delivered and linked |
| TASK-002 | done | Flow diagrams validated and linked |
| TASK-003 | done | OpenAPI + DTO baseline + contract checks |
| TASK-004 | done | Added section tests + responsive tablet snapshots |
| TASK-005 | done | Added unit + integration checks for payment constraints |
| TASK-006 | done | Mock smoke and visual baseline stable |
| TASK-007 | done | Guided onboarding now runs inside `/products` using shared create logic |
| TASK-008 | done | Preview/apply repricing now runs inside `/products` with audit summary preserved |
| TASK-009 | done | Paste-and-apply bulk import accepted intentionally and made explicit in the UI |
| TASK-010 | done | Legacy `/catalog` and `/inventory` were removed from the operational route model; converged suite updated |

---

## 4. Task Audit Result

- `workflow-manager/docs/tasks/` currently contains ten task documents: `TASK-001` through `TASK-010`.
- `TASK-001` through `TASK-010` are marked `done` and their referenced outputs still exist in the repository.
- `PRODUCTS-003` is now closed after route convergence moved the remaining admin flows fully into `/products`.
- Recent extension work remains traceable through `PRODUCTS-001`, `PRODUCTS-002`, `PRODUCTS-003`, and `I18N-001`.

---

## 5. Current Planning Items

Open planning item:

- `POS-002` cash register sessions and actor audit:
  - status: `in_progress`
  - scope:
    - open/close one cash register session per drawer/device,
    - capture opening float and closing counted cash,
    - reconcile expected versus counted balance,
    - record manual cash events such as `paid in`, `paid out`, and `safe drop`,
    - establish a scalable actor model through `app_users` plus future role assignments,
    - define restrictive role bundles and permission codes so UI surfaces and sensitive data are protected by default,
    - separate operational, managerial, executive, and technical access without coupling business approvals to `system_admin`,
    - add a later `system_admin` role-composer flow so each business can define custom role bundles over the stable permission catalog
  - architecture direction:
    - `CashRegister` + `CashRegisterSession` aggregate lifecycle
    - immutable `CashMovement` ledger for every cash-affecting event
    - `ActorContext` passed into command use cases instead of ad hoc headers
    - permission-code based authorization under business-facing role bundles
    - seed roles as safe presets, while keeping the underlying model ready for custom role composition
    - role-aware UI/data guards across `/cash-register`, `/sales`, `/products`, `/receivables`, and `/reporting`
    - request-scoped auth later mapped into `app_users`, while service-role access stays reserved for trusted internal jobs
  - current design depth:
    - `Slice 0` identity/permission bootstrap is implemented
    - includes tables, DTOs, `GET /api/v1/me`, `GET /api/v1/app-users`, temporary `assume-user` bridge, permission snapshot contract, and initial per-screen permission matrix
    - shell and workspaces already react through operator selection, filtered rail, blocked states, and first server-side route guards
    - `Slice 1` register-session core is also implemented
    - includes `cash_register_sessions` + `cash_movements`, `GET /api/v1/cash-registers`, `GET /api/v1/cash-registers/{id}/active-session`, `POST /api/v1/cash-register-sessions`, and `POST /api/v1/cash-register-sessions/{id}/close`
    - `/cash-register` now exposes a real operator-facing session panel with register selection, opening float, active-session summary, and counted closeout modal
    - `Slice 2` workspace guardrails and read-model redaction is also implemented
    - `/sales` now keeps a summary-only mode for lower-trust operators and reserves customer/item detail for `sales_history.view_all_registers`
    - `/reporting` now supports an operational subset for `shift_supervisor`, while margin, credit exposure, and inventory-value blocks stay hidden unless the strategic permissions exist
    - `Slice 3` cash movement ledger is also implemented
    - `/cash-register` now includes an active-session movement list plus a modal for `paid in`, `paid out`, `safe drop`, and `adjustment`
    - `GET /api/v1/cash-registers/{id}/active-session` now returns movement detail with actor attribution and `POST /api/v1/cash-register-sessions/{id}/movements` updates expected balance in real time
    - `Slice 4` automatic drawer integrations are also implemented
    - `POST /api/v1/sales` now appends `cash_sale` into the active session when checkout collects cash, including partial cash collected during `on_account` checkout
    - `POST /api/v1/debt-payments` now appends `debt_payment_cash` into the active session when receivables payments are tied to the selected drawer
    - `/cash-register` and the receivables modal now expose the same active-drawer context so operators can confirm expected-balance changes without leaving the workflow
    - `Slice 5` discrepancy approval and business authorization is also implemented
    - closeouts above tolerance now move to `closing_review_required`, exposing who submitted the count and who approved the discrepancy
    - `shift_supervisor` and `business_manager` now hold `cash.session.close.override_discrepancy`, while `cashier` still closes directly only within tolerance
    - `/cash-register` now includes the supervisor review checkpoint with approve-closeout and reopen-for-recount actions
    - `Slice 6` role catalog and permission composition UI is also implemented
    - `/users-admin` now lets `system_admin` clone presets, compose permission bundles, assign roles to users, and validate the resulting shell/data snapshot by switching operator from the same workspace
    - the permission catalog now includes `roles.manage`, seed roles are locked system presets, and custom roles can be created without code changes
    - `Slice 7` hardening is also implemented
    - `/api/v1/me` now exposes request attribution metadata so the shell can distinguish authenticated login, support override, and fallback operator resolution
    - request actor resolution now prefers validated Supabase bearer tokens mapped through `app_users.auth_user_id`, while authenticated-but-unmapped requests degrade to zero permissions instead of inheriting the default demo actor
    - the `assume-user` bridge is now controlled by `POS_ENABLE_ASSUME_USER_BRIDGE`, remaining available by default only outside production
    - `/cash-register` now queues manual cash movements offline and can replay them into the real ledger through sync retry without enabling offline open/close flows
    - `Slice 8` real login checkpoint is also implemented
    - `/login` now uses Supabase Auth email/password and the same `app_users.auth_user_id` mapping already consumed by `/api/v1/me`
    - request actor resolution now also reads authenticated SSR cookies, so browser login works across the existing `/api/v1/*` routes without screen-specific auth wiring
    - the shell now exposes `Iniciar sesión` / `Cerrar sesión`, and authenticated operators are redirected to the first workspace allowed by their permission snapshot
    - `Slice 9` real credential provisioning is also implemented
    - `/users-admin` now lets `system_admin` provision or repair real Supabase Auth credentials for existing `app_users` without leaving the workspace
    - the workspace snapshot now exposes auth credential status/email so missing vs stale mappings can be resolved from the UI before disabling the support bridge
    - every planned slice now carries an explicit UI checkpoint so the workflow can be exercised visually before expanding the backend scope
  - main artifacts:
    - `workflow-manager/docs/features/POS-002-cash-register-sessions-and-actor-audit-planning.md`
    - `workflow-manager/docs/planning/diagrams/class-cash-register-session-domain.md`
    - `workflow-manager/docs/planning/diagrams/sequence-cash-register-open-close.md`
    - `workflow-manager/docs/planning/diagrams/sequence-identity-and-permission-bootstrap.md`
    - `workflow-manager/docs/planning/diagrams/activity-cash-register-day.md`
    - `workflow-manager/docs/planning/diagrams/state-cash-register-session.md`

Completed planning item:

- `SOURCING-001` external product sourcing and assisted import:
  - status: `done`
  - PoC status: `completed`
  - implementation status: search, assisted import, continuity recovery, and failed-queue triage are fully delivered
  - sourcing task status:
    - `SRC-TASK-001` provider feasibility and contract lock -> `done`
    - `SRC-TASK-002` search slice -> `done`
    - `SRC-TASK-003` assisted import slice -> `done`
    - `SRC-TASK-004` learned category mappings -> `done`
    - `SRC-TASK-005` import history -> `done`
    - `SRC-TASK-006` UI integration and operator UX -> `done`
    - `SRC-TASK-007` provider hardening -> `done`
    - `SRC-TASK-008` resume state across reload/session restore -> `done`
    - `SRC-TASK-009` failed import queue across sessions -> `done`
  - follow-up use cases:
    - `UC-SRC-012` resume sourcing search session -> `done`
    - `UC-SRC-013` resume import draft edits -> `done`
    - `UC-SRC-014` recover interrupted sourcing session after refresh/browser close -> `done`
    - `UC-SRC-015` persist failed import items for later review -> `done`
    - `UC-SRC-016` review failed import queue -> `done`
    - `UC-SRC-017` retry a failed import item -> `done`
    - `UC-SRC-018` dismiss a failed import item -> `done`
    - `UC-SRC-019` filter failed queue by status -> `done`
  - current output:
    - `GET /api/v1/product-sourcing/search`
    - `POST /api/v1/product-sourcing/import`
    - `GET/PATCH/DELETE /api/v1/product-sourcing/category-mappings`
    - `GET /api/v1/product-sourcing/import-history`
    - dedicated `/products/sourcing` screen reachable from `/products`
    - `/products/sourcing` now runs inside the shared workspace shell so the main navigation remains visible during sourcing
    - sourcing search now uses shared infinite-scroll loading instead of treating the first page size as a final total
    - `product-sourcing` module runtime wired to real catalog creation through `CatalogProductWriter`
    - selected external images are persisted into the managed storage bucket `product-sourcing-images`
    - traceability rows are persisted in `imported_product_sources`
    - confirmed external category paths are persisted in `external_category_mappings`
    - later searches now reuse the confirmed internal category automatically when the external category path matches
    - category entry across onboarding and sourcing now normalizes operator-friendly labels into canonical codes to prevent duplicate categories caused by different writing styles
    - Carrefour provider calls are now wrapped with process-local throttling plus structured health logging
    - opt-in live provider smoke remains available through `npm run probe:product-sourcing:carrefour` guarded by `PRODUCT_SOURCING_LIVE_SMOKE=1`
    - learned category mappings can be reviewed, corrected, and deleted from the sourcing workspace itself
    - recent imports can be reviewed from the sourcing workspace with internal product name, SKU, category, and import timestamp
    - sourcing UI now has explicit tablet/mobile validation coverage for search, selection summary placement, and import CTA visibility
    - partial failed import batches now stay actionable from the same sourcing screen with retryable vs non-recoverable feedback and cleanup actions
    - sourcing sessions now persist the active query, loaded results, selected ids, and inline import drafts across full page reloads
    - operators can explicitly discard a restored sourcing session from the sourcing screen to reset the workflow cleanly
    - failed imports now persist in a separate durable queue across sessions with filters for pending, retryable, non-recoverable, dismissed, and resolved states
    - queue entries can be reloaded into the current selection, retried directly, or dismissed from active triage
    - reusable infinite-scroll primitives now drive the product lists in `/sales`, `/products`, and `/products/sourcing`
    - the bulk price update product selector now follows the same infinite-scroll pattern for large selection scopes
    - product cards across `/sales`, `/products`, and `/products/sourcing` now share a common visual shell so media proportions and card geometry stay consistent while each module keeps its own metadata
    - deterministic SKU dedupe (`CRF-<sourceProductId>`) remains as a secondary import guardrail
    - contract/use-case/provider/UI tests with deterministic fixtures, including fixture-backed real-backend sourcing runs
    - real-backend UI proof from sourcing to `/products` and `/sales`, plus managed image URL verification and persisted category mapping reuse
  - main artifact: `workflow-manager/docs/features/SOURCING-001-external-product-sourcing-and-assisted-import-planning.md`

Resolved cross-cutting planning item:

- `Product image storage strategy`
  - status: `done`
  - scope delivered:
    - manual onboarding now supports file upload and URL ingestion into managed Supabase Storage
    - product edit now supports image replacement by file upload or URL ingestion into managed Supabase Storage
    - sourcing already persisted imported images into managed storage, so interactive product flows now share the same policy
    - no migration/backfill is planned for existing development data
  - remaining optional extension:
    - align `/api/v1/products/import` batch CSV ingestion with the same managed-image policy
  - related artifact: `workflow-manager/docs/features/CATALOG-001-guided-product-onboarding-and-placeholders-draft.md`

---

## 6. Verification Snapshot

- Real-backend module suite: `npm run test:e2e:ui:real:modules` -> passing.
- Real-backend release gate: `npm run test:e2e:release-gate:real` -> passing.
- Access-control Slice 0 verification: `tests/e2e/access-control-api.spec.ts` and `tests/e2e/access-control-shell-ui.spec.ts` cover operator selection, `/api/v1/me`, permission-filtered rail visibility, blocked workspaces, and 403 enforcement on protected routes.
- Cash-register session Slice 1 verification: `tests/e2e/cash-register-session-api.spec.ts` and `tests/e2e/cash-register-session-ui.spec.ts` cover register discovery, opening float capture, open-session conflict protection, active-session lookup, counted closeout, and discrepancy persistence.
- Workspace guardrails Slice 2 verification: `tests/e2e/access-control-api.spec.ts`, `tests/e2e/access-control-shell-ui.spec.ts`, `tests/e2e/orders-ui-sales-snapshot.spec.ts`, and `tests/e2e/reporting-ui-filters-and-metrics.spec.ts` cover summary-only `/sales`, server-redacted sale detail, hidden strategic reporting metrics, and supervisor operational reporting visibility.
- Cash movement ledger Slice 3 verification: `tests/e2e/cash-register-session-api.spec.ts`, `tests/e2e/cash-register-session-ui.spec.ts`, and `tests/e2e/api-contract-conformance.spec.ts` cover manual movement recording, active-session ledger detail, expected-balance updates, and the new movement endpoint contract.
- Discrepancy approval Slice 5 verification: `tests/e2e/access-control-api.spec.ts`, `tests/e2e/cash-register-session-api.spec.ts`, and `tests/e2e/cash-register-session-ui.spec.ts` cover the new override permission, review-required closeouts, supervisor approval, and reopen-for-recount UI flow.
- Hardening Slice 7 verification: `tests/e2e/access-control-api.spec.ts`, `tests/e2e/access-control-shell-ui.spec.ts`, and `tests/e2e/offline-cash-movement-recovery.spec.ts` cover authenticated actor precedence over the support bridge, visible session attribution in the rail, and offline manual cash-movement replay into the real ledger.
- Real-login Slice 8 verification: `tests/e2e/access-control-login-ui.spec.ts` covers Supabase password login, redirect to the permitted workspace, authenticated attribution in the shell, and logout back to `/login`.
- Credential-provisioning Slice 9 verification: `tests/e2e/access-control-credentials-admin-api.spec.ts` and `tests/e2e/access-control-credentials-admin-ui.spec.ts` cover creating/updating auth credentials for `app_users`, then signing in through `/login` with the provisioned operator.
- NFR evidence baseline: `workflow-manager/docs/planning/008-nfr-validation-evidence-ready.md`.
- UC to E2E mapping: `workflow-manager/docs/planning/006-uc-e2e-traceability-matrix-ready.md`.
- Unified `/products` workspace coverage: `tests/e2e/products-workspace-ui.spec.ts`, `tests/e2e/products-workspace-infinite-scroll-ui.spec.ts`, `tests/e2e/products-workspace-api.spec.ts`.
- Converged `/products` coverage: `tests/e2e/ui-vertical-slices-smoke.spec.ts`, `tests/e2e/catalog-ui-onboarding-and-bulk-update.spec.ts`, `tests/e2e/inventory-ui-stock-movement.spec.ts`.
- Sales catalog infinite-scroll coverage: `tests/e2e/sales-catalog-infinite-scroll-ui.spec.ts`.
- Bulk price selection infinite-scroll coverage: `tests/e2e/bulk-price-selection-infinite-scroll-ui.spec.ts`.
- Sourcing UI coverage: `tests/e2e/product-sourcing-ui.spec.ts`, `tests/e2e/product-sourcing-import-ui.spec.ts`, `tests/e2e/product-sourcing-import-use-case.spec.ts`.
- Sourcing infinite-scroll verification: `tests/e2e/product-sourcing-ui.spec.ts` proves that the first provider page is loaded with `pageSize=8`, later pages append automatically through the sentinel flow, and existing selection is preserved.
- Sourcing resume-state verification: `tests/e2e/product-sourcing-resume-state-ui.spec.ts` proves that a full page reload restores the active sourcing query, visible results, selected item, and inline draft fields without issuing a second initial search request.
- Sourcing failed-queue verification: `tests/e2e/product-sourcing-failed-queue-ui.spec.ts` proves that failed imports persist across sessions, can be filtered by status, retried to resolution, and dismissed into a separate triage state.
- Sourcing trace verification: local Supabase validation confirmed one `imported_product_sources` row and a managed public URL under `product-sourcing-images` after the real-backend UI import flow.
- Sourcing category mapping verification: `tests/e2e/product-sourcing-category-mapping-ui.spec.ts` proves that a category confirmed in one import is auto-reused on a later result sharing the same external path.
- Sourcing category mapping management verification: `tests/e2e/product-sourcing-category-mapping-management-ui.spec.ts` proves that learned mappings can be updated and deleted from the UI and that the next search reflects the change.
- Sourcing import history verification: `tests/e2e/product-sourcing-import-ui.spec.ts` and `tests/e2e/product-sourcing-import-history-use-case.spec.ts` prove that recent imports remain queryable from persisted trace data with internal product name and SKU.
- Partial failed import verification: `tests/e2e/product-sourcing-import-ui.spec.ts` proves that a batch with one already-imported source and one new source keeps the failed item visible, classified as non-recoverable, and removable from the active selection.
- Category canonicalization verification: `tests/e2e/catalog-onboarding-api.spec.ts`, `tests/e2e/products-workspace-ui.spec.ts`, and `tests/e2e/product-sourcing-category-mapping-ui.spec.ts` prove that operator-facing category labels remain readable while stored ids are normalized to canonical slug codes.
- Managed product image verification: `tests/e2e/catalog-onboarding-api.spec.ts` proves that explicit `imageUrl` values are copied into Supabase Storage and that multipart file replacement on `PATCH /api/v1/products/{id}` also returns managed storage URLs; `tests/e2e/products-workspace-ui.spec.ts` proves the same behavior through the `/products` UI.
- Provider hardening verification: `tests/e2e/product-sourcing-provider-hardening.spec.ts` proves throttled provider calls plus structured success/failure health events for the Carrefour adapter wrapper.
- Responsive sourcing verification: `tests/e2e/product-sourcing-responsive-ui.spec.ts` proves the sourcing flow remains usable on tablet and mobile widths without losing the selected-items summary or the import action.
