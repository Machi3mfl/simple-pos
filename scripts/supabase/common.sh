#!/usr/bin/env bash
set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly LOCAL_ENV_FILE="$ROOT_DIR/.env.local"
# Pin the CLI version so local Docker orchestration stays reproducible across machines.
readonly SUPABASE_CLI_VERSION="2.76.15"
readonly SUPABASE_PROJECT_ID="simple-pos"

supabase_cli() {
  (
    cd "$ROOT_DIR"
    npx -y "supabase@${SUPABASE_CLI_VERSION}" "$@"
  )
}
