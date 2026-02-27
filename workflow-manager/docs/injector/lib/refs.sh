#!/usr/bin/env bash

if [[ -z "${TMP_DIR:-}" ]]; then
  TMP_DIR="${TMPDIR:-/tmp}"
fi

init_refs_store() {
  if [[ -n "${REFS_FILE:-}" && -f "$REFS_FILE" ]]; then
    return 0
  fi

  REFS_FILE="$(mktemp "$TMP_DIR/injector.refs.XXXXXX")"
  printf '{}\n' > "$REFS_FILE"
  export REFS_FILE
}

cleanup_refs_store() {
  if [[ -n "${REFS_FILE:-}" && -f "$REFS_FILE" ]]; then
    rm -f "$REFS_FILE"
  fi
}

refs_put() {
  local bucket="$1"
  local key="$2"
  local value="$3"
  local tmp

  tmp="$(mktemp "$TMP_DIR/injector.refs.update.XXXXXX")"
  jq --arg bucket "$bucket" --arg key "$key" --arg value "$value" \
    '.[$bucket] = (.[$bucket] // {}) | .[$bucket][$key] = $value' \
    "$REFS_FILE" > "$tmp"
  mv "$tmp" "$REFS_FILE"
}

refs_get() {
  local bucket="$1"
  local key="$2"

  jq -r --arg bucket "$bucket" --arg key "$key" '.[$bucket][$key] // empty' "$REFS_FILE"
}

refs_has() {
  local bucket="$1"
  local key="$2"

  local value
  value="$(refs_get "$bucket" "$key")"
  [[ -n "$value" ]]
}

refs_dump() {
  jq '.' "$REFS_FILE"
}
