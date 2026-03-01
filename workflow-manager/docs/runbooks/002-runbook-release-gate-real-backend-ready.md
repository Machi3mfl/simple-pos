# Runbook: Iteration 6 Real-Backend Release Gate

## Objective

Execute the pre-release quality gate against a real local persistence backend (Supabase) for critical MVP flows:
- product onboarding (`/api/v1/products`)
- stock movements (`/api/v1/stock-movements`)
- sales registration (`/api/v1/sales`)
- reporting read models (`/api/v1/reports/*`)

## Preconditions

- Supabase CLI available (`npx -y supabase --version`).
- Docker daemon running.
- Project dependencies installed (`npm install`).
- Recommended Node.js version: `>=20.17.0` (newer CLI dependencies emit engine warnings on `20.16.0`).

## Steps

1. Start local Supabase stack:

```bash
npx -y supabase start
```

2. Apply/reset local schema (uses `supabase/migrations/*.sql`):

```bash
npx -y supabase db reset --local
```

3. Export runtime env variables (optional only when running Playwright manually):

```bash
export POS_BACKEND_MODE=supabase
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="<local-service-role-key>"
```

4. Run real-backend release-gate tests:

```bash
npm run test:e2e:release-gate:real
```

This command now:
- starts Supabase if needed
- resets the local DB
- auto-loads `API_URL` and `SERVICE_ROLE_KEY` from `supabase status -o env`
- maps them to `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

5. Run the real-backend UI suite by module (catalog, inventory, sales, receivables, reporting, sync):

```bash
npm run test:e2e:ui:real:modules
```

This command resets the local Supabase DB before executing tests and intentionally does not clean data at the end so generated records remain available for manual inspection.

## Expected Result

- `tests/e2e/release-gate-real-backend.spec.ts` passes.
- No contract/build/lint regressions from mock mode baseline.

## Notes

- Default mode remains `mock` when `POS_BACKEND_MODE` is not set.
- Existing `npm run test:e2e` still validates the full mock-first suite.
