#!/usr/bin/env bash

get_datasets_root() {
  printf '%s\n' "${INJECTOR_DATASETS_DIR:-$DATASETS_DIR}"
}

dataset_matches_profile() {
  local file_name="$1"
  local profile_raw="${INJECTOR_PROFILE:-all}"

  if [[ -z "$profile_raw" || "$profile_raw" == "all" ]]; then
    return 0
  fi

  local profile
  IFS=',' read -r -a profiles <<<"$profile_raw"
  for profile in "${profiles[@]}"; do
    profile="$(sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' <<<"$profile")"
    if [[ -n "$profile" && "$file_name" == "$profile"-* ]]; then
      return 0
    fi
  done

  return 1
}

collect_dataset_files() {
  local entity="$1"
  local datasets_root
  datasets_root="$(get_datasets_root)"

  local entity_dir="$datasets_root/$entity"

  if [[ ! -d "$entity_dir" ]]; then
    return 0
  fi

  local file
  while IFS= read -r file; do
    if dataset_matches_profile "$(basename "$file")"; then
      printf '%s\n' "$file"
    fi
  done < <(find "$entity_dir" -maxdepth 1 -type f -name '*.json' | sort)
}

load_entity_records() {
  local entity="$1"
  local files=()
  local file

  while IFS= read -r file; do
    files+=("$file")
  done < <(collect_dataset_files "$entity")

  if [[ ${#files[@]} -eq 0 ]]; then
    printf '[]\n'
    return 0
  fi

  jq -cs '
    [
      .[]
      | if type == "array" then .[]
        elif type == "object" and has("records") then .records[]
        else .
        end
    ]
  ' "${files[@]}"
}

get_record_by_key() {
  local entity="$1"
  local key="$2"
  local records

  records="$(load_entity_records "$entity")"
  jq -c --arg key "$key" '.[] | select(.key == $key) | . ' <<<"$records" | head -n 1
}

records_count() {
  local records_json="$1"
  jq -r 'length' <<<"$records_json"
}
