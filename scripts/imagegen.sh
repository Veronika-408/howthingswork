#!/usr/bin/env bash
# Generate or edit one image with the Codex CLI's built-in image tool (any image model works; this is
# the one the existing art was made with). Run from anywhere:
#   scripts/imagegen.sh gen  <prompt.txt> <out.png> [style-reference.png] [size words...]
#   scripts/imagegen.sh edit <prompt.txt> <out.png> <image-to-edit.png>  [size words...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
mode=$1 prompt=$2 out=$3 ref=${4:--}; shift 4 || shift $#
size=${*:-"landscape at the highest available resolution"}
if [[ $mode == edit ]]; then
  how="in IMAGE-EDIT mode with the attached image as Image 1 (the image to edit)"
else
  how="once"; [[ $ref != - ]] && how="once, attaching the attached image as a STYLE REFERENCE only (follow the written prompt for content)"
fi
args=(); [[ $ref != - ]] && args=(-i "$ref")
echo "Use your built-in image generation tool exactly once, $how, passing the contents of $prompt verbatim as the prompt. Size: $size. Then copy the resulting PNG file to $out. Do nothing else. Print the final file path and pixel dimensions." \
  | codex exec --skip-git-repo-check -s workspace-write "${args[@]}" 2>&1 | tail -3
