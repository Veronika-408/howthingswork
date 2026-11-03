# Add a machine to howthings.work

howthings.work is a picture encyclopedia for small children. It's a pencil map of a little river town,
and every machine drawn in colour opens up: a hand-painted cut-away plate with clickable parts,
detail that keeps getting sharper as you zoom, and "How it works" book pages that move. Everything
still grey is waiting to be built. Whoever builds a machine gets their name on it.

This guide is for the AI agent doing the building. The person you work with only decides **what** to build.
Your job is to make it as good as the jumbo jet and the tram, then open a pull request they can be proud of.

## 0. Before you start

1. **Pick something free.** Check what is already in colour (`subjects/*/subject.json`, plus the plane),
   what is waiting in grey (`soon` in `world/src/world.js`), and what someone else is already doing:
   `gh pr list --repo virpo/howthingswork --state open`. Don't build anything that is taken.
   Suggest grey machines first (excavator, tower crane, church bell, fire engine, …). A machine that
   isn't on the map at all is fine too, but then it also needs a spot on the map (step 5).
2. **Say it's taken.** Open a draft pull request titled `Add <machine>` early, so nobody else starts the same one.
3. **Ask for the credit line.** The name or @handle and a link, which go into `credit` in `subject.json`.
   Tell the user that contributions are made under the [Contributor Terms](https://github.com/virpo/howthingswork/blob/main/CONTRIBUTING.md):
   they keep the credit, and the maintainer may publish and sell the encyclopedia with their machine in it.
4. **Use the skills.** Install `infinite-book-explainer` from https://github.com/virpo/agent-skills
   (`skills/infinite-book-explainer`; until it is merged to main, it is on the branch `feat/infinite-book-explainer`) and follow it for the art. It documents the method this project was
   built with, and every mistake already made. In this repository, also follow `.claude/skills/add-a-machine`.
5. **Tools:** Python 3 with `pillow numpy scipy scikit-image`, Node 20+, Chrome, `npm install --prefix tools`,
   and an image model that can both generate and edit an image with a reference attached.
   `scripts/imagegen.sh` wraps the Codex CLI's image tool, which made all the existing art. Others work if you keep the prompts.

## 1. Scaffold

```
python3 tools/new_machine.py excavator "The Excavator" excavator
```

`subjects/tram/` is the complete worked example: copy its patterns, not its pictures.

## 2. The plate

Use template 1 in `docs/prompts/README.md`. Generate three, then pick one, and save it as `art/plate.png`.
Keep the prompt in `art/prompts/plate.txt`. Before accepting it, check it **at full size** with
`python3 scripts/grid.py art/plate.png /tmp/grid.png`, and count everything: wheels, axles, buckets,
windows, people per seat. Image models get counts and linkages wrong all the time, so redo the plate until
the machine would convince an engineer. The machine must face the same way as on the map.

## 3. Parts

Choose 8 to 14 parts a three-year-old can point at.
- `src/hotspots.js`: an outline polygon per part, in plate pixels (trace them on the grid), plus a label position and the tour order.
- `src/parts.js`: for each part a lead sentence, 2 or 3 facts, 1 or 2 numbers, and a "Can you find it?" line.
  Write short, concrete sentences, and only facts you have checked.
- `art/detail/<part>.png`: one close-up painting per part (template 2, with the plate attached).

## 4. Deep zoom

```
SUBJECT=excavator python3 scripts/tiles.py plan
SUBJECT=excavator python3 scripts/tiles.py all <part>        # for every part
```

Then add 2 or 3 parts inside the most interesting parts to `src/zoom.js` (outlines in pixels of the part's
tile), run `plan` again, and run `all <part>/<sub>` for each. Look at every tile next to its source
(`art/zoom/src/` vs `art/zoom/tiles/`). Reject any that moved, added or lost something.

## 5. Colour it in on the map

The map is shared, so you never edit `world/art/world.png`. Your machine brings a coloured cut-out of itself:

```
python3 tools/colour_in.py crop excavator 1160 540 230 150     # the grey drawing's area in map pixels, with a margin
# paint subjects/excavator/world/painted.png from grey.png with template 4 (image edit)
python3 tools/colour_in.py cut excavator                       # writes world/colour.png and overlay.rect
```

Then fill in `spot` in `subject.json`:
- `polys`: the outline on the map.
- `plus`: where the small "+" sits.
- `axis`: two map points along the machine, left end first.
- `plateAxis`: the same two points on your plate.

The camera uses the two axes to zoom into the map until the drawing lies exactly on the plate, then
dissolves into it, so get them right. Set `replaces` to the id of the grey machine you coloured in.
That removes it from the "coming soon" list.

### Inside something else

A machine doesn't have to sit on the map. It can be drawn inside another space, like the skin inside the
body or the cell inside the skin. Set `parent` to that space's id, give `spot` in that space's plate pixels,
and skip `colour_in.py`. Then you can keep zooming in as far as you like. See `docs/SPACES.md`.

## 6. "How it works" (strongly encouraged)

Choose one or two pages that let a child **do** something: dig, lift, ring, steer.
- `art/book/`: the paintings (template 5). Paint the machine switched off and still, because the code
  makes it move: parts cut from the painting, or exact shapes drawn over it, so the mechanics are right.
- `mechanisms.js`: the pages, registered in `window.MECHANISMS` with the helpers in `window.MECH_KIT`.
  `subjects/tram/mechanisms.js` is the example, and `src/book.js` documents the stage it gets.
- `build_book.py` (optional): prepares the cut-out layers into `assets/<id>/book/`.
- `how` in `subject.json`: which parts open which page, the page thumbnails, and which part each page belongs to.

## 7. Check it like a reviewer

```
python3 build.py && python3 -m http.server -d dist 8765 &
node tools/smoke.mjs                         # every machine, every part, every page; must print no errors
node tools/screenshots.mjs excavator         # writes subjects/excavator/screenshots/
```

Look at the screenshots yourself, on desktop and on a phone. Check:
- The zoom from the map lands on the plate without a jump.
- No part outline is off.
- No painting has text in it.
- The colours sit right on the map.

## 8. The pull request

Commit everything under `subjects/<id>/` and nothing else, unless you fixed a shared bug (explain it if
you did). Then fill in the pull request template:
- What was built.
- Who it's credited to.
- What you checked.
- The screenshots, embedded from your branch: `![map](https://raw.githubusercontent.com/<you>/howthingswork/<branch>/subjects/<id>/screenshots/desktop-1-map.jpg)`.

The maintainer reviews the pictures first, so make them easy to see.

## The house style, in short

- Ink and watercolour on warm ivory paper, 1980s–90s cut-away encyclopedia. Never 3D, cartoon or photo.
- No text, logos or lettering inside any picture. The page adds the labels.
- Technically right, counts included. Facts a three-year-old can follow, checked.
- The map stays pencil grey. Only built machines are in colour.
- Paint motion with code, not video: the machine sits still in the painting, and the page moves it.
