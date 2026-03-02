#!/usr/bin/env bash
set -Eeuo pipefail

INJECTOR_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$INJECTOR_ROOT/injector.mjs" "$@"
