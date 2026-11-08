#!/usr/bin/env bash
# One image call for the lab, through the Codex CLI's built-in image tool, with a shared limit on how many
# run at once (all variants together) and a log line per call in <variant>/genlog.jsonl.
#
#   lab/tools/gen.sh <variant-dir> gen  <prompt.txt> <out.png> [style-reference.png] [--size "words"]
#   lab/tools/gen.sh <variant-dir> edit <prompt.txt> <out.png> <image-to-edit.png> [reference.png] [--size "words"]
#
# gen:  a new picture; an optional attached image is a STYLE REFERENCE ONLY.
# edit: Image 1 is the picture being changed; an optional second image is a reference (Image 2).
# Results come back at about 1.5 megapixels whatever size is asked for: read the real size (it is logged).
# Env: LAB_SLOTS (default 6) = how many calls may run at once across all variants.
set -uo pipefail
LAB="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$(dirname "$LAB")"
[ $# -lt 4 ] && { sed -n '2,12p' "$0"; exit 2; }
vdir=$1 mode=$2 prompt=$3 out=$4; shift 4
img1=""; img2=""; size="landscape at the highest available resolution"
while [ $# -gt 0 ]; do
  case $1 in --size) size=$2; shift 2;; *) if [ -z "$img1" ]; then img1=$1; else img2=$1; fi; shift;; esac
done
cd "$ROOT"
[ -f "$prompt" ] || { echo "no prompt file $prompt"; exit 2; }
mkdir -p "$(dirname "$out")"

# ---- a slot: one of LAB_SLOTS lock directories; stale ones (dead pid) are taken over
SLOTS=${LAB_SLOTS:-6}; SD="$LAB/.slots"; mkdir -p "$SD"; slot=""
while [ -z "$slot" ]; do
  for i in $(seq 1 "$SLOTS"); do
    if mkdir "$SD/$i" 2>/dev/null; then echo $$ > "$SD/$i/pid"; slot=$i; break; fi
    p=$(cat "$SD/$i/pid" 2>/dev/null || true)
    if [ -n "$p" ] && ! kill -0 "$p" 2>/dev/null; then rm -rf "$SD/$i"; fi
  done
  [ -z "$slot" ] && sleep 4
done
trap 'rm -rf "$SD/$slot"' EXIT

# ---- the call
for d in "$HOME"/.nvm/versions/node/*/bin; do [ -x "$d/codex" ] && NODEBIN=$d; done
export PATH="${NODEBIN:-}:$PATH"
args=()
if [ "$mode" = edit ]; then
  [ -f "$img1" ] || { echo "edit needs the image to edit"; exit 2; }
  how="in IMAGE-EDIT mode with the first attached image as Image 1 (the image to edit)"
  args=(-i "$img1"); [ -n "$img2" ] && { how="$how and the second attached image as Image 2 (a reference)"; args+=(-i "$img2"); }
else
  how="once"
  [ -n "$img1" ] && { how="once, attaching the attached image as a STYLE REFERENCE ONLY (follow the written prompt for composition and content)"; args=(-i "$img1"); }
fi
t0=$(date +%s)
msg=$(echo "Use your built-in image generation tool exactly once, $how, passing the contents of $prompt verbatim as the prompt. Size: $size. Then copy the resulting PNG file to $out. Do nothing else. Print the final file path and pixel dimensions." \
  | codex exec --skip-git-repo-check -s workspace-write "${args[@]}" 2>&1 | tail -3)
t1=$(date +%s)
ok=false; w=0; h=0
if [ -f "$out" ] && [ "$(stat -f %m "$out")" -ge "$t0" ]; then
  ok=true
  w=$(sips -g pixelWidth "$out" 2>/dev/null | awk '/pixelWidth/{print $2}'); h=$(sips -g pixelHeight "$out" 2>/dev/null | awk '/pixelHeight/{print $2}')
fi
mkdir -p "$vdir"
printf '{"t":"%s","secs":%d,"mode":"%s","prompt":"%s","out":"%s","in":"%s","ok":%s,"w":%s,"h":%s}\n' \
  "$(date -u +%FT%TZ)" $((t1 - t0)) "$mode" "$prompt" "$out" "$img1${img2:+,$img2}" $ok "${w:-0}" "${h:-0}" >> "$vdir/genlog.jsonl"
echo "$msg"
$ok && echo "OK $out ${w}x${h} in $((t1 - t0))s" || { echo "FAILED $out after $((t1 - t0))s"; exit 1; }
