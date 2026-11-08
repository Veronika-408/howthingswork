# Brief for a variant builder (read all of it, then your variant's APPROACH.md)

## The goal

howthings.work is an infinitely zoomable picture encyclopedia for small children (live: https://howthings.work,
code: this repository). The owner wants to know whether a different way of making the pictures would be
more beautiful, easier to make for every part, easier to change later, and nicer to use. Five builders
build the same demo five ways, at the same time; afterwards they are compared side by side. You build ONE
variant, completely: "100% finished", not a sketch. A child should be able to use it.

The demo (identical content in every variant; words in `lab/content.js`, written for ages 3–11):

```
city ─┬─ plane ── pilots ── drive          town → the jumbo jet → its flight deck → you fly it
      └─ human ── skin ── cell ── lysosome  town → a person at the bus stop → skin → a cell → a lysosome
```

Every space lists its parts in `lab/content.js` (`CONTENT.spaces.<space>.parts`). Every part must be
drawn, have an outline (polys) in your `data.js`, and be clickable. The child links are: city `plane` →
plane, city `people` → human, plane `cockpit` → pilots, pilots `yoke` → drive, human `skin` → skin,
skin `cell` → cell, cell `lysosome` → lysosome.

## Where you work

- Everything you make goes in your folder `lab/<your-variant>/`. Do not edit anything outside it: not
  `lab/core/`, not `lab/content.js`, not other variants, not the live site. If the core lacks something,
  work around it in your renderer and write the request in your REPORT.md; if a core bug blocks you, say
  exactly what in your final message.
- Read `lab/core/API.md` now. The core (viewer) is being written while you make art; `lab/core/READY`
  appears when it works. Do the art and the data first, then wire up and test.
- Serve with `python3 -m http.server 8766 -d lab` (check first: `curl -s localhost:8766/ >/dev/null`), and open
  `http://localhost:8766/<your-variant>/`.
- Tools: Python is `/usr/bin/python3` (has Pillow, numpy, scipy, scikit-image; the Homebrew `python3` does
  NOT). Node: `source ~/.zshrc >/dev/null 2>&1; _dotfiles_load_nvm >/dev/null 2>&1`. `cwebp` and `potrace`
  are installed. Browser checks: Playwright via `lab/tools/` (see `tools/browser.mjs` in the repo root for a launcher).
- Ship pictures as `.webp` (or `.png` where you need exact alpha); keep the source PNGs and every prompt
  (`art/prompts/*.txt`) next to the art. Put rejected images in `art/rejected/` with a line on why.

## Making pictures

`lab/tools/gen.sh <your-folder> gen|edit <prompt.txt> <out.png> [image…] [--size "words"]` (read its header).
It waits for a free slot (six calls at once across all builders), and logs every call to your
`genlog.jsonl`. Those logs are the cost numbers in the comparison, so make every image through it. Run at
most two at a time yourself (background them, and inspect one batch while the next renders). A call takes
about one minute. Results are about 1.5 megapixels whatever size you ask for, so read the real size.

The house rules, which every variant keeps:
- No text, letters, numbers or labels inside any picture. Labels are drawn by code.
- Technically right: a Boeing 747-400 has 4 engines (2 per wing, spread out), 18 wheels (2 nose, 16 main),
  a hump with the flight deck on the upper level; the two pilots sit SIDE BY SIDE, captain on the left,
  each with their own control wheel, the four thrust levers between them. Skin has a top layer
  (epidermis), a middle layer (dermis) with hair follicles, sweat glands, nerves and blood vessels, and
  fat underneath. A cell has a nucleus, mitochondria, ER, Golgi, lysosomes and a membrane. A lysosome is a
  round bubble with a single membrane, pumps in it, enzymes inside, a worn-out part (an old mitochondrion
  in a wrapping) being digested, a germ being digested, little delivery bubbles arriving, small pieces
  leaving through doors.
- Look at every image at full size (crops) before using it. Count things. Redo rather than ship a wrong count.
- The parent's drawing of a child must show the same thing as the child's own picture: same objects, same
  arrangement, same colours. Paint one from the other (attach it as a reference), never independently.
  The family at the bus stop in the town is the person you dive into (a woman in a yellow raincoat, a man,
  a boy holding her hand, as on the live site, or your own, but the same in both pictures).
- For children: friendly and warm, but not cartoon. Detailed enough to explore for minutes.
- Motion is code, never AI video.

## The edit test (required, after the demo works)

The owner's real pain is changing a picture later. Do both, the way your approach would, and measure them:

1. **"Five people at the bus stop instead of three."** In the town, the bus stop gets five people; the family
   you dive into must stay and the dive must still line up.
2. **"Give the captain a coffee cup."** In the pilots space, a cup appears by the captain.

For each: wall-clock time, image calls (from genlog), what had to be regenerated or redone (whole picture?
a layer? a sticker? nothing?), whether anything else broke (the dive, the outlines), and before/after
screenshots in `shots/`. Keep the "after" state in the shipped demo, and the "before" files too. Don't fake it.

## Checks

- `node lab/tools/shots.mjs <your-variant>` (once the core is READY) walks both chains, sets each age and
  saves screenshots (desktop 1440×900 and phone 390×844) to `lab/<your-variant>/shots/`. It also prints errors.
  It must print none. Look at the screenshots yourself.
- Open every part, fly the plane, dive down and back up both chains, at desktop and phone width.
- Use `?slowmo=8` to watch a dive frame by frame: the child must sit exactly on the parent's drawing of it.

## Report: `lab/<your-variant>/REPORT.md`

1. The approach in practice: what you did, and what you would do differently.
2. Numbers: image calls (total, kept, rejected), generation minutes (sum of `secs` in genlog), your wall time,
   asset bytes shipped.
3. The edit test: both edits, with time, calls, what was redone, and the screenshots.
4. Self-assessment, 1–10 with one honest line each: beauty / book feel; coherence across levels; sharpness when
   zooming in; how seamless the dives are; how easy it was to make every part; how easy edits are; cost to
   grow the world (a new machine); the experience for a child.
5. Known problems, and what the approach would need to be production-ready.

Finish with a short final message: where the demo is, the headline numbers, the scores, and anything that is not
finished.
