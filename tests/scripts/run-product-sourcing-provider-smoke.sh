#!/usr/bin/env bash
set -euo pipefail

QUERY="${1:-coca cola}"
LIMIT="${2:-5}"

if [[ "${PRODUCT_SOURCING_LIVE_SMOKE:-0}" != "1" ]]; then
  echo "Skipping live Carrefour provider smoke. Set PRODUCT_SOURCING_LIVE_SMOKE=1 to run."
  exit 0
fi

node workflow-manager/docs/pocs/scripts/product-sourcing-vtex-probe.mjs carrefour "$QUERY" "$LIMIT"
