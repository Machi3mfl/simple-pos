# [TRAINING-001] Feature: Playwright Tutorial Video Suite

## Metadata

**Feature ID**: `TRAINING-001`
**Status**: `done`
**GitHub Issue**: `TBD`
**Priority**: `medium`
**Linked Scope**: `operator enablement`, `tutorial recordings`, `playwright automation`, `demo pacing`
**Planning Reference**: `workflow-manager/docs/planning/007-execution-status-simple-pos-ready.md`
**Architecture Artifacts**:
- `workflow-manager/docs/planning/diagrams/class-tutorial-recording-suite.md`
- `workflow-manager/docs/planning/diagrams/sequence-tutorial-recording-cash-register.md`
- `workflow-manager/docs/planning/diagrams/activity-tutorial-video-production.md`

---

## Business Goal

Produce repeatable tutorial videos that show the main operator workflows with slower, understandable pacing for low-experience users.

The first slice must leave a separate Playwright suite capable of recording a full cash-register tutorial without changing the behavior or timing of the existing E2E release gates.

---

## Current Baseline

The repository already has:

- a stable Playwright E2E stack with authenticated fixtures and seeded demo operators,
- real-backend coverage for cash-register, checkout, receivables, and products flows,
- video recording configured only for failure evidence in the main E2E suite,
- no tutorial-specific suite, pacing abstraction, or recording-focused scripts.

Current gap:

- existing tests are optimized for deterministic validation, not for human-friendly viewing,
- dynamic entity names and fast interactions make the flows hard to use as tutorials,
- the main `playwright.config.ts` should remain optimized for automated testing rather than training-video production.

---

## Architecture Decision

### Pattern Choice

The best fit is:

- a **separate Playwright configuration** dedicated to tutorial recording,
- a **Tutorial Driver facade** that wraps `Page` interactions with paced steps, slow typing, and optional on-screen captions,
- **scenario specs** under `tests/tutorials/` that reuse existing auth/data helpers while keeping tutorial concerns isolated from release-gate E2E tests.

Why this fits:

- tutorial pacing is a presentation concern and should not leak into validation tests,
- the facade keeps recording behavior consistent across scenarios without cloning delay logic into every spec,
- existing login/bootstrap helpers stay reusable,
- the suite can evolve independently with its own scripts, output policy, and viewport defaults.

### Explicit Rejections

- Do not slow down the main E2E suite globally.
  - Reason: it would hurt developer feedback time and CI duration for a non-testing concern.
- Do not rely only on browser `slowMo`.
  - Reason: human-friendly tutorials need longer holds after semantic checkpoints such as modal open, success toasts, and section changes.
- Do not fork the application UI for tutorial-only states.
  - Reason: recordings should exercise the real operator experience, not a hidden training variant.

---

## Slice Plan

### Slice 1: Tutorial Harness + Cash Register Tutorial

Deliver:

- `playwright.tutorials.config.ts`
- `tests/tutorials/support/tutorial-driver.ts`
- `tests/tutorials/cash-register-open-close.tutorial.spec.ts`
- `package.json` tutorial scripts

Acceptance:

- `npm run tutorials:record:cash` runs a cash-register tutorial flow into Playwright artifacts.
- Tutorial flow uses slower, configurable pacing than E2E.
- Existing `npm run test:e2e` behavior remains unchanged.

### Slice 1 Status

- Stabilized with scenario-local mocks for `/api/v1/me`, `/api/v1/products`, and cash-register endpoints so the shell bootstrap stays deterministic during recording.
- Verified on Saturday, March 7, 2026 with:
  - fast functional run using zeroed pacing env vars
  - default paced recording run via `npm run tutorials:record:cash`
- Latest validation result:
  - spec passed in ~48.5s with tutorial pacing enabled
  - full wrapper command completed in ~1.1m including local Supabase reset and app boot

### Slice 2: Checkout Tutorial for Cash and On-Account

Deliver:

- `tests/tutorials/checkout-cash-and-on-account.tutorial.spec.ts`
- dedicated scripts for checkout recording and smoke validation

Acceptance:

- `npm run tutorials:record:checkout` records a checkout tutorial covering `cash` and `on_account`
- The scenario stays deterministic through scenario-local shell and sales mocks
- Fast smoke validation does not overwrite the human-paced artifact output

### Slice 2 Status

- Stabilized with scenario-local mocks for `/api/v1/me`, `/api/v1/products`, `/api/v1/customers`, and `/api/v1/sales`.
- Verified on Saturday, March 7, 2026 with:
  - fast smoke run via `npm run tutorials:smoke:checkout`
  - default paced recording run via `npm run tutorials:record:checkout`
- Latest validation result:
  - spec passed in ~46.2s with tutorial pacing enabled
  - generated video duration: ~45.9s at `1000x658`
  - full wrapper command completed in ~1.0m including local Supabase reset and app boot

### Slice 3: Products Tutorial for Search, Edit, and Stock Add

Deliver:

- `tests/tutorials/products-search-edit-stock.tutorial.spec.ts`
- dedicated scripts for product-workspace recording and smoke validation

Acceptance:

- `npm run tutorials:record:products` records a product-workspace tutorial covering search, edit, and stock registration
- The scenario stays deterministic through scenario-local shell, workspace, and stock-movement mocks
- Fast smoke validation does not overwrite the human-paced artifact output

### Slice 3 Status

- Stabilized with scenario-local mocks for `/api/v1/me`, `/api/v1/products`, `/api/v1/products/workspace`, `/api/v1/stock-movements`, and `PATCH /api/v1/products/:id`.
- Verified on Saturday, March 7, 2026 with:
  - fast smoke run via `npm run tutorials:smoke:products`
  - default paced recording run via `npm run tutorials:record:products`
- Latest validation result:
  - spec passed in ~1.0m with tutorial pacing enabled
  - generated video duration: ~60.4s at `1000x658`
  - full wrapper command completed in ~1.3m including local Supabase reset and app boot

### Slice 4: MP4 Export and Stable Naming

Deliver:

- `tests/scripts/export-tutorial-videos.sh`
- stable `.mp4` export command and output folder for review/share flows

Acceptance:

- `npm run tutorials:export` converts the recorded `.webm` tutorial artifacts to `.mp4`
- exported files use stable names that do not depend on Playwright artifact folder hashes

### Slice 4 Status

- Stabilized with a deterministic export map from the tutorial spec artifacts to:
  - `simple-pos-01-caja-basica.mp4`
  - `simple-pos-02-cobro-efectivo-cuenta-corriente.mp4`
  - `simple-pos-03-productos-busqueda-edicion-stock.mp4`
- Export output directory defaults to `test-results/tutorial-videos`

### Planned Next Slices

- Optional caption/script generation

### Final Verification

- Verified on Sunday, March 8, 2026 with:
  - `npm run build`
  - `npm run tutorials:smoke:cash`
  - `npm run tutorials:smoke:checkout`
  - `npm run tutorials:smoke:products`

---

## Technical Design

### Planned File Boundaries

- `playwright.tutorials.config.ts`
  - tutorial-only runner config
- `tests/tutorials/support/tutorial-driver.ts`
  - pacing facade for UI actions
- `tests/tutorials/*.tutorial.spec.ts`
  - human-readable tutorial flows
  - scenario-local mocks for deterministic recording when the real backend bootstrap is too brittle for operator-facing capture

### Code Examples

Recording commands:

```bash
npm run tutorials:record
npm run tutorials:record:cash
npm run tutorials:record:checkout
npm run tutorials:record:products
npm run tutorials:export
npm run tutorials:smoke:cash
npm run tutorials:smoke:checkout
npm run tutorials:smoke:products
```

Tutorial driver shape:

```ts
await tutorial.step("Abrir caja con cambio inicial", async () => {
  await tutorial.fill(page.getByTestId("cash-session-opening-float-input"), "1200.00");
  await tutorial.click(page.getByTestId("cash-session-open-button"));
});
```

Configurable pacing:

```bash
TUTORIAL_TYPING_DELAY_MS=90 \
TUTORIAL_STEP_DELAY_MS=1400 \
TUTORIAL_SUCCESS_HOLD_MS=2200 \
npm run tutorials:record:cash
```

Configurable recording size:

```bash
TUTORIAL_VIDEO_WIDTH=1000 \
TUTORIAL_VIDEO_HEIGHT=658 \
npm run tutorials:record:cash
```

Smoke validation output separation:

- `tutorials:record:*` keeps the human-paced artifacts under `test-results/tutorials`
- `tutorials:smoke:*` writes to `test-results/tutorials-smoke` so quick validation runs do not overwrite the tutorial video intended for review

Exported tutorial outputs:

- `tutorials:export` reads from `test-results/tutorials`
- exported `.mp4` files land in `test-results/tutorial-videos`
- both source and export directories can be overridden with `TUTORIAL_SOURCE_DIR` and `TUTORIAL_EXPORT_DIR`

---

## Testing Strategy

- Keep tutorial specs outside the release-gate commands.
- Validate the new suite with targeted local recording runs.
- Keep tutorial mocks aligned with typed DTO contracts used by the real UI.
- Prefer fixed demo values over timestamp-heavy labels whenever the UI is shown to end users.

---

## Risks and Mitigations

- **Risk**: tutorial videos become flaky because of dynamic seeded state.
  - **Mitigation**: bootstrap the browser with deterministic state and keep API responses local to the scenario when necessary.
- **Risk**: recordings are still too fast for inexperienced operators.
  - **Mitigation**: centralize step pacing in env-driven helper defaults instead of per-test ad hoc waits.
- **Risk**: suite diverges from real workflows.
  - **Mitigation**: build tutorial scenarios on top of existing validated flows and selectors.

---

## Definition of Done

- [x] Feature doc and diagrams created
- [x] Separate Playwright tutorial config added
- [x] Tutorial driver with paced interactions added
- [x] Cash-register tutorial scenario records successfully
- [x] Checkout tutorial scenario records successfully
- [x] Products tutorial scenario records successfully
- [x] `package.json` scripts documented
- [x] `WORKFLOW_INDEX.md` updated
