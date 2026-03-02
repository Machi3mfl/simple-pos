# Runbook: Iteration 6 Real-Backend Release Gate

## Objective

Execute the pre-release quality gate against a real local persistence backend (Supabase) for critical MVP flows:
- product onboarding (`/api/v1/products`)
- stock movements (`/api/v1/stock-movements`)
- sales registration (`/api/v1/sales`)
- reporting read models (`/api/v1/reports/*`)

## Preconditions

- Docker daemon running.
- Local Supabase bootstrap scripts available via `package.json`.
- Project dependencies installed (`npm install`).
- No global Supabase CLI install is required because the scripts pin the CLI via `npx`.
- Recommended Node.js version: `>=20.17.0` (newer CLI dependencies emit engine warnings on `20.16.0`).

## Steps

1. Start local Supabase stack and write `.env.local` from the running Docker services:

```bash
npm run supabase:start
```

2. Apply/reset local schema (uses `supabase/migrations/*.sql`):

```bash
npm run supabase:reset
```

3. Start the local Next.js app against the Dockerized Supabase stack when doing manual validation:

```bash
npm run dev:local
```

This command:
- starts Supabase if needed
- refreshes `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- launches `next dev`

4. Export runtime env variables manually only when running Playwright or custom scripts outside the provided npm commands:

```bash
export POS_BACKEND_MODE=supabase
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="<local-service-role-key>"
```

`POS_BACKEND_MODE` is only used to gate real-backend test suites; application routes now always use Supabase persistence.

5. Run real-backend release-gate tests:

```bash
npm run test:e2e:release-gate:real
```

This command now:
- starts Supabase if needed
- resets the local DB
- auto-loads `API_URL` and `SERVICE_ROLE_KEY` from `supabase status -o env`
- maps them to `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

6. Run the real-backend UI suite by module (orders, catalog, inventory, sales, receivables, reporting, sync):

```bash
npm run test:e2e:ui:real:modules
```

This command resets the local Supabase DB before executing tests and intentionally does not clean data at the end so generated records remain available for manual inspection.

## Expected Result

- `tests/e2e/release-gate-real-backend.spec.ts` passes.
- `tests/e2e/sync-idempotency-and-retry-api.spec.ts` passes.
- `tests/e2e/orders-ui-sales-snapshot.spec.ts` passes inside the real-module UI suite.
- No contract/build/lint regressions from the real-backend baseline.

## Notes

- Local Supabase Docker orchestration is now committed in:
  - `scripts/supabase/common.sh`
  - `scripts/supabase/start-local.sh`
  - `scripts/supabase/reset-local.sh`
  - `scripts/supabase/status-local.sh`
  - `scripts/supabase/stop-local.sh`
  - `scripts/supabase/write-local-env.sh`
  - `scripts/supabase/dev-local.sh`
  - `supabase/config.toml`
- Sales opens with an empty order list unless the operator explicitly adds products.
- Orders shows a snapshot list of recorded sales by consuming the same `sales-history` read model used by Reporting.
- Real-module UI specs create their own products because no demo catalog is auto-seeded anymore.
