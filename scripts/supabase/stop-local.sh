#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

supabase_cli stop --project-id "$SUPABASE_PROJECT_ID"
