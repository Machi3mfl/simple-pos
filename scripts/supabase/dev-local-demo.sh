#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if command -v lsof >/dev/null 2>&1 && lsof -iTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; then
  cat <<'EOF'
Port 3001 is already in use.
Stop the existing Next.js process first, then run:
  npm run dev:demo
EOF
  exit 1
fi

bash "$ROOT_DIR/scripts/supabase/reset-local-demo-auth.sh"

cd "$ROOT_DIR"
exec npm run dev -- "$@"
