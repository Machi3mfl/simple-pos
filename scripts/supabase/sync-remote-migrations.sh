#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Apply local SQL migrations to a remote Postgres instance (Railway/Supabase self-hosted).

Usage:
  scripts/supabase/sync-remote-migrations.sh [--env-file <FILE>] [--database-url <URL>] [--migrations-dir <DIR>] [--dry-run]
  scripts/supabase/sync-remote-migrations.sh [--env-file <FILE>] [--database-url <URL>] [--migrations-dir <DIR>] --mark-applied <FILE.sql> [--mark-applied <FILE.sql> ...]

Options:
  --env-file       Env file to source before running (default: .env.production.local if present, else .env.local).
  --database-url   Postgres connection string. Falls back to $DATABASE_URL then $SUPABASE_DB_URL.
  --migrations-dir Directory containing .sql migrations (default: supabase/migrations).
  --dry-run        Print pending/applied status without executing SQL.
  --mark-applied   Record a migration as applied (without executing SQL). Can be repeated.
  -h, --help       Show this help message.

Behavior:
  - Applies files in lexicographical order (timestamped filenames work naturally).
  - Tracks applied files in public.app_migration_history.
  - Reconciles with supabase_migrations.schema_migrations when available.
  - Stores file checksum and fails if an already-applied filename has changed.
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DATABASE_URL="${DATABASE_URL:-}"
ENV_FILE="$REPO_ROOT/.env.production.local"
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE="$REPO_ROOT/.env.local"
fi
ENV_FILE_SET_BY_FLAG="false"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"
DRY_RUN="false"
MARK_APPLIED_FILES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      ENV_FILE_SET_BY_FLAG="true"
      shift 2
      ;;
    --database-url)
      DATABASE_URL="${2:-}"
      shift 2
      ;;
    --migrations-dir)
      MIGRATIONS_DIR="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --mark-applied)
      MARK_APPLIED_FILES+=("${2:-}")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  echo "Loading environment from: $ENV_FILE"
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
elif [[ "$ENV_FILE_SET_BY_FLAG" == "true" ]]; then
  echo "Error: env file not found: $ENV_FILE"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required but not installed."
  exit 1
fi

DATABASE_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: missing DATABASE_URL."
  echo "Provide it via --database-url, or set DATABASE_URL/SUPABASE_DB_URL in $ENV_FILE."
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Error: migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

MIGRATIONS_DIR="$(cd "$MIGRATIONS_DIR" && pwd)"

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
    return
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
    return
  fi

  openssl dgst -sha256 "$file" | awk '{print $2}'
}

PSQL=(psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" <<'SQL'
CREATE TABLE IF NOT EXISTS public.app_migration_history (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

has_supabase_history="$("${PSQL[@]}" -tAc "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL;")"
has_supabase_history="$(echo "$has_supabase_history" | tr -d '[:space:]')"

if [[ "${#MARK_APPLIED_FILES[@]}" -gt 0 ]]; then
  for marked_file in "${MARK_APPLIED_FILES[@]}"; do
    if [[ -z "$marked_file" ]]; then
      echo "Error: --mark-applied requires a filename."
      exit 1
    fi

    migration_path="$marked_file"
    if [[ ! -f "$migration_path" ]]; then
      migration_path="$MIGRATIONS_DIR/$marked_file"
    fi

    if [[ ! -f "$migration_path" ]]; then
      echo "Error: migration file not found for --mark-applied: $marked_file"
      exit 1
    fi

    filename="$(basename "$migration_path")"
    checksum="$(hash_file "$migration_path")"

    "${PSQL[@]}" \
      --set=migration_name="$filename" \
      --set=migration_checksum="$checksum" <<'SQL'
INSERT INTO public.app_migration_history (filename, checksum)
VALUES (:'migration_name', :'migration_checksum')
ON CONFLICT (filename) DO UPDATE
  SET checksum = EXCLUDED.checksum;
SQL

    echo "Marked as applied: $filename"
  done

  echo "Done."
  exit 0
fi

MIGRATION_FILES=()
while IFS= read -r migration_file; do
  MIGRATION_FILES+=("$migration_file")
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ ${#MIGRATION_FILES[@]} -eq 0 ]]; then
  echo "No .sql files found in $MIGRATIONS_DIR"
  exit 0
fi

echo "Found ${#MIGRATION_FILES[@]} migration file(s) in $MIGRATIONS_DIR"

applied_count=0
skipped_count=0

for migration_file in "${MIGRATION_FILES[@]}"; do
  filename="$(basename "$migration_file")"
  checksum="$(hash_file "$migration_file")"
  escaped_filename="$(printf "%s" "$filename" | sed "s/'/''/g")"
  migration_version="${filename%%_*}"
  migration_version="${migration_version%.sql}"
  escaped_migration_version="$(printf "%s" "$migration_version" | sed "s/'/''/g")"

  existing_checksum="$("${PSQL[@]}" -tAc "SELECT checksum FROM public.app_migration_history WHERE filename = '$escaped_filename';")"
  existing_checksum="$(echo "$existing_checksum" | tr -d '[:space:]')"

  if [[ -n "$existing_checksum" ]]; then
    if [[ "$existing_checksum" != "$checksum" ]]; then
      echo "Checksum mismatch for already-applied migration: $filename"
      echo "Database checksum: $existing_checksum"
      echo "Current file checksum: $checksum"
      echo "Refusing to continue. Create a new migration instead of editing applied files."
      exit 1
    fi

    echo "Skipping already applied: $filename"
    skipped_count=$((skipped_count + 1))
    continue
  fi

  if [[ "$has_supabase_history" == "t" ]]; then
    exists_in_supabase_history="$("${PSQL[@]}" -tAc "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '$escaped_migration_version' LIMIT 1;")"
    exists_in_supabase_history="$(echo "$exists_in_supabase_history" | tr -d '[:space:]')"

    if [[ "$exists_in_supabase_history" == "1" ]]; then
      if [[ "$DRY_RUN" == "true" ]]; then
        echo "Applied in supabase_migrations (history backfill needed): $filename"
      else
        "${PSQL[@]}" \
          --set=migration_name="$filename" \
          --set=migration_checksum="$checksum" <<'SQL'
INSERT INTO public.app_migration_history (filename, checksum)
VALUES (:'migration_name', :'migration_checksum')
ON CONFLICT (filename) DO UPDATE
  SET checksum = EXCLUDED.checksum;
SQL
        echo "Backfilled from supabase_migrations: $filename"
      fi

      skipped_count=$((skipped_count + 1))
      continue
    fi
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "Pending: $filename"
    continue
  fi

  echo "Applying: $filename"

  "${PSQL[@]}" \
    --set=migration_file="$migration_file" \
    --set=migration_name="$filename" \
    --set=migration_checksum="$checksum" <<'SQL'
\i :migration_file
INSERT INTO public.app_migration_history (filename, checksum)
VALUES (:'migration_name', :'migration_checksum');
SQL

  applied_count=$((applied_count + 1))
done

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run complete."
  exit 0
fi

echo "Done. Applied: $applied_count, Skipped: $skipped_count"
