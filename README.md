# simple-pos

Simple POS for cash-register operations, sales, inventory, receivables, and reporting.

## Environment Variables

This project uses two different env contexts:

1. Next.js runtime (`src/app`, API routes, server/browser Supabase clients).
2. Demo injector (`workflow-manager/docs/injector/injector.mjs`).

Do not mix them when deploying.

### Next.js Runtime (Deploy)

Required for production runtime:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Public Supabase URL used by browser + server auth clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key used for browser auth/session resolution. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side privileged key for protected repositories/routes. Never expose to client. |

Recommended for production hardening:

| Variable | Required | Purpose |
| --- | --- | --- |
| `ACTOR_SESSION_SECRET` | recommended | Secret used to sign `actor_session` cookie (HMAC). Prevents cookie tampering. |
| `POS_ENABLE_ASSUME_USER_BRIDGE` | recommended | Enables/disables assume-user bridge. Set `false` in production. |
| `APP_ENV` | recommended outside Vercel | Explicit runtime environment marker. Use `production` in prod. |

Optional runtime tuning:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXTAUTH_SECRET` | optional | Fallback secret if `ACTOR_SESSION_SECRET` is not set. |
| `POS_RUNTIME_ENV` | optional | Alternative environment marker (same intent as `APP_ENV`). |
| `POS_DEFAULT_APP_USER_ID` | optional | Default actor fallback for local/demo flows. |
| `PRODUCT_SOURCING_PROVIDER_MIN_INTERVAL_MS` | optional | Minimum delay between provider calls for sourcing throttling. |
| `PRODUCT_SOURCING_CARREFOUR_FIXTURE` | optional | Local fixture path for Carrefour provider testing. |

Reference file: [`.env.production.example`](./.env.production.example)

### Injector Runtime (Seeder Scripts)

These variables are used only by:

- `workflow-manager/docs/injector/injector.sh`
- `workflow-manager/docs/injector/injector.mjs`

Key examples:

| Variable | Purpose |
| --- | --- |
| `INJECTOR_APP_BASE_URL` | Next.js app URL used by injector for protected API calls. |
| `INJECTOR_TARGET_NAME` | Logical label for logs (`local-development`, `staging`, `production`). |
| `INJECTOR_ALLOW_REMOTE_WRITE` | Safety gate for mutating non-local targets. |
| `INJECTOR_ALLOW_DEMO_AUTH_USERS_ON_REMOTE` | Blocks known demo auth users on remote by default. |
| `INJECTOR_ONBOARDING_ADMIN_*` | Bootstrap secure `system_admin` credentials for a new environment. |

Full injector docs:

- [`workflow-manager/docs/injector/README.md`](./workflow-manager/docs/injector/README.md)

### Migration CLI (Remote)

Remote migrations support 2 drivers:

1. `psql` sync script (default): best for Railway/self-hosted Postgres.
2. Supabase CLI push (optional): useful when direct `supabase db push --db-url` works for your target.

`SUPABASE_DB_URL` is used by migration scripts only (not by app runtime).

| Variable | Purpose |
| --- | --- |
| `SUPABASE_DB_URL` | Postgres connection string used by `supabase db push --db-url ...` to apply migrations in remote environments. |
| `SUPABASE_DB_SSLMODE` | Optional sslmode override (`require`, `disable`, etc.). If URL already contains `sslmode`, this value replaces it. |

## Quick Production Checklist

1. Configure runtime keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
2. Set `ACTOR_SESSION_SECRET` to a strong random value.
3. Set `POS_ENABLE_ASSUME_USER_BRIDGE=false`.
4. Set `APP_ENV=production` (or equivalent runtime env marker).
5. Run migrations.
6. Bootstrap admin using `onboarding-admin` if needed.

## Remote Migration Script

Default (psql sync):

```bash
npm run supabase:migrate:remote:dry-run
npm run supabase:migrate:remote
```

Optional Supabase CLI mode:

```bash
npm run supabase:migrate:remote:cli:dry-run
npm run supabase:migrate:remote:cli
```

By default they read env from `.env.local`. For production/staging, point to a private file:

```bash
ENV_FILE=.env.production.local npm run supabase:migrate:remote:dry-run
ENV_FILE=.env.production.local npm run supabase:migrate:remote
```

Security notes:

- Keep `SUPABASE_DB_URL` only in private env files or platform secrets.
- Never commit real connection strings.
- If your provider proxy refuses TLS, set `SUPABASE_DB_SSLMODE=disable` (or include `sslmode=disable` directly in `SUPABASE_DB_URL`).
