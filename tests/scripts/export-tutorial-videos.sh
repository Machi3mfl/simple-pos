#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="${TUTORIAL_SOURCE_DIR:-$ROOT_DIR/test-results/tutorials}"
OUTPUT_DIR="${TUTORIAL_EXPORT_DIR:-$ROOT_DIR/test-results/tutorial-videos}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to export tutorial videos to mp4."
  exit 1
fi

if ! command -v ffprobe >/dev/null 2>&1; then
  echo "ffprobe is required to inspect tutorial video outputs."
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

declare -a TUTORIAL_EXPORTS=(
  "cash-register-open-close|simple-pos-01-caja-basica"
  "checkout-cash-and-on|simple-pos-02-cobro-efectivo-cuenta-corriente"
  "products-search-edit-stock|simple-pos-03-productos-busqueda-edicion-stock"
)

for export_entry in "${TUTORIAL_EXPORTS[@]}"; do
  source_pattern="${export_entry%%|*}"
  output_name="${export_entry##*|}"
  source_video="$(find "$SOURCE_DIR" -path "*${source_pattern}*video.webm" | sort | tail -n 1)"

  if [[ -z "$source_video" ]]; then
    echo "Missing tutorial recording for pattern '${source_pattern}' in '${SOURCE_DIR}'."
    exit 1
  fi

  output_video="$OUTPUT_DIR/${output_name}.mp4"

  ffmpeg \
    -y \
    -i "$source_video" \
    -c:v libx264 \
    -preset veryfast \
    -crf 22 \
    -pix_fmt yuv420p \
    -movflags +faststart \
    -an \
    "$output_video" \
    >/dev/null 2>&1

  duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$output_video")"
  resolution="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$output_video")"

  printf 'Exported %s -> %s (%ss, %s)\n' "$source_pattern" "$output_video" "$duration" "$resolution"
done
