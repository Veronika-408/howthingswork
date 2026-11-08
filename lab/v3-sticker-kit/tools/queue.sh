#!/usr/bin/env bash
# Run image jobs two at a time through lab/tools/gen.sh. Each line of the job file:
#   mode|prompt-name|out-name|ref1|ref2|size
cd "$(dirname "$0")/../../.."; V=lab/v3-sticker-kit
run() { IFS='|' read -r mode p o r1 r2 size <<< "$1"
  lab/tools/gen.sh $V $mode $V/art/prompts/$p.txt $V/art/sheets/$o.png ${r1:+$V/art/sheets/$r1.png} ${r2:+$V/art/sheets/$r2.png} --size "${size:-landscape 3:2 at the highest available resolution}" > $V/art/sheets/$o.log 2>&1
  echo "$(date +%T) $(tail -1 $V/art/sheets/$o.log)" >> $V/art/queue.log; }
while IFS= read -r line; do
  [ -z "$line" ] && continue
  while [ "$(jobs -r | wc -l)" -ge 2 ]; do sleep 2; done
  run "$line" &
  sleep 1
done < "$1"
wait
echo "$(date +%T) queue done" >> $V/art/queue.log
