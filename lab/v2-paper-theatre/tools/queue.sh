#!/usr/bin/env bash
# A tiny job queue so this variant never runs more than two image calls at once.
#   tools/queue.sh add <name> gen|edit <prompt> <out> [img1] [img2]    queue a call
#   tools/queue.sh work                                                 start two workers (they stop when idle 20 min)
#   tools/queue.sh status
set -uo pipefail
V="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$(cd "$V/../.." && pwd)"; Q="$V/.queue"
mkdir -p "$Q/todo" "$Q/run" "$Q/done"
case "${1:-}" in
  add) shift; name=$1; shift; printf '%q ' "$@" > "$Q/todo/$(date +%s%N)-$name"; echo "queued $name";;
  status) echo "todo: $(ls "$Q/todo" | sed 's/^[0-9]*-//' | tr '\n' ' ')"; echo "run:  $(ls "$Q/run" | sed 's/^[0-9]*-//' | tr '\n' ' ')";
          echo "done: $(ls -t "$Q/done" | head -8 | sed 's/^[0-9]*-//' | tr '\n' ' ')";;
  work)
    for w in 1 2; do
      ( idle=0
        while [ $idle -lt 1200 ]; do
          j=$(ls "$Q/todo" 2>/dev/null | head -1)
          if [ -z "$j" ] || ! mv "$Q/todo/$j" "$Q/run/$j" 2>/dev/null; then sleep 3; idle=$((idle + 3)); continue; fi
          idle=0
          args=$(cat "$Q/run/$j")
          ( cd "$ROOT" && eval "lab/tools/gen.sh lab/v2-paper-theatre $args" ) > "$Q/run/$j.log" 2>&1
          mv "$Q/run/$j.log" "$Q/done/$j.log"; mv "$Q/run/$j" "$Q/done/$j"
        done ) &
    done
    echo "workers started";;
  *) sed -n '2,5p' "$0";;
esac
