#!/usr/bin/env bash
# Downloads 2 velocity layers of Salamander Grand Piano samples
# pp (velocity 1) and ff (velocity 13) from @audio-samples/piano-mp3 via jsDelivr
# Output: client/public/salamander/pp/ and client/public/salamander/ff/

set -e

BASE="https://cdn.jsdelivr.net/npm/@audio-samples/piano-mp3-velocity"
OUT_DIR="$(dirname "$0")/../client/public/salamander"

mkdir -p "$OUT_DIR/pp" "$OUT_DIR/ff"

# Each entry: "ToneJsKey|UrlEncodedFileStem|LocalFilename"
# ToneJsKey  = how Tone.js refers to the note (D#1, F#1)
# UrlStem    = filename stem on jsDelivr (# must be %23)
# LocalName  = filename we save locally (# → s, matching existing convention)
NOTES=(
  "A0|A0|A0"
  "C1|C1|C1"
  "D#1|D%231|Ds1"
  "F#1|F%231|Fs1"
  "A1|A1|A1"
  "C2|C2|C2"
  "D#2|D%232|Ds2"
  "F#2|F%232|Fs2"
  "A2|A2|A2"
  "C3|C3|C3"
  "D#3|D%233|Ds3"
  "F#3|F%233|Fs3"
  "A3|A3|A3"
  "C4|C4|C4"
  "D#4|D%234|Ds4"
  "F#4|F%234|Fs4"
  "A4|A4|A4"
  "C5|C5|C5"
  "D#5|D%235|Ds5"
  "F#5|F%235|Fs5"
  "A5|A5|A5"
  "C6|C6|C6"
  "D#6|D%236|Ds6"
  "F#6|F%236|Fs6"
  "A6|A6|A6"
  "C7|C7|C7"
  "D#7|D%237|Ds7"
  "F#7|F%237|Fs7"
  "A7|A7|A7"
  "C8|C8|C8"
)

VEL_PP=1
VEL_FF=13

total=${#NOTES[@]}
count=0

for entry in "${NOTES[@]}"; do
  IFS='|' read -r tone_key url_stem local_name <<< "$entry"
  count=$((count + 1))

  pp_url="${BASE}${VEL_PP}/audio/${url_stem}v${VEL_PP}.mp3"
  ff_url="${BASE}${VEL_FF}/audio/${url_stem}v${VEL_FF}.mp3"

  printf "[%2d/%d] %s ... " "$count" "$total" "$tone_key"

  curl -sf -o "$OUT_DIR/pp/${local_name}.mp3" "$pp_url"
  curl -sf -o "$OUT_DIR/ff/${local_name}.mp3" "$ff_url"

  echo "ok"
done

echo ""
echo "Done! Files written to:"
echo "  $OUT_DIR/pp/  ($(ls "$OUT_DIR/pp" | wc -l | tr -d ' ') files)"
echo "  $OUT_DIR/ff/  ($(ls "$OUT_DIR/ff" | wc -l | tr -d ' ') files)"
