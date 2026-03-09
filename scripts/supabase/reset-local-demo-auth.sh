#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

bash "$ROOT_DIR/scripts/supabase/reset-local.sh"
bash "$ROOT_DIR/workflow-manager/docs/injector/injector.sh" auth-users

cat <<'EOF'

Local database reset and demo auth users are ready.

Important:
If Next.js was already running on localhost:3001, restart it now.
`supabase:reset` rewrites .env.local with fresh local Supabase keys, and an already-running dev server keeps the old values in memory.

Recommended commands:
  npm run dev:demo
  npm run dev
EOF
