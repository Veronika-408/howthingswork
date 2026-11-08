#!/usr/bin/env bash
# Run image calls from a job file, at most 2 at a time: each line = "mode prompt out [image1] [image2]" (paths from repo root).
jobs="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
cd "$(dirname "$0")/../../.." || exit 1
grep -v '^#' "$jobs" | grep -v '^\s*$' | xargs -P 2 -L 1 bash -c 'lab/tools/gen.sh lab/v5-ink-and-wash "$@" > "${2%.png}.log" 2>&1; tail -1 "${2%.png}.log"' _
