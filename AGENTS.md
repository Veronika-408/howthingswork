# howthings.work: instructions for agents

A picture encyclopedia for small children: a pencil map whose coloured machines open into hand-painted
cut-away plates, deep zoom and moving "How it works" pages. Live at https://howthings.work.

## If you are here to add a machine (the usual reason)

1. Follow **docs/ADD-A-MACHINE.md** step by step. It's also published at https://howthings.work/contribute.md.
2. Use the skills:
   - **`infinite-book-explainer`** from https://github.com/virpo/agent-skills (`skills/infinite-book-explainer`; until it is merged to main, it is on the branch `feat/infinite-book-explainer`),
     for the art method, prompts, acceptance checks and the mistakes already made.
   - **`.claude/skills/add-a-machine`** in this repository, for this project's file layout and rules.
   Install or read both before generating any image.
3. Pick something free: not in colour yet (`subjects/*/subject.json`) and not in an open pull request
   (`gh pr list --repo virpo/howthingswork --state open`). Open a draft pull request early to claim it.
4. Change only `subjects/<id>/` unless you are fixing a shared bug, and say so in the pull request.
5. Before the pull request: `python3 build.py`, serve `dist/`, then run `node tools/smoke.mjs` (no errors)
   and `node tools/screenshots.mjs <id>`. Embed the screenshots in the pull request.

## Rules that keep it one book

- Never edit `world/art/world.png`. A machine colours itself in with `subjects/<id>/world/colour.png`
  (`tools/colour_in.py`).
- No text inside pictures. Ink and watercolour on ivory paper, 1980s–90s cut-away style. Counts and
  mechanics technically right. Facts short, checked and child-sized.
- Look at every generated image at full size before using it. Redo it rather than ship a wrong wheel count.
- Motion is code, never AI video.
- Keep prompts next to the art they made (`art/prompts/`, and `art/zoom/prompts/` is written for you).

## Layout

| Path | What |
|---|---|
| `src/` | the viewer: `app.js` (map, camera, canvas renderer), `book.js` (book pages), `mechanisms.js` (plane pages + `MECH_KIT`), `plane.html` |
| `art/`, `src/parts.js`, `src/hotspots.js`, `src/zoom.js` | the jumbo jet (built in, older layout) |
| `subjects/<id>/` | every other machine: `subject.json`, `src/`, `art/`, `world/`, `mechanisms.js`, `build_book.py`, `screenshots/` |
| `world/` | the map: `art/world.png`, its tiles, sprites; `src/world.js` (grey machines, clouds, traffic) |
| `scripts/` | `tiles.py` (deep-zoom repaints), `grid.py`, `cutout.py`, `imagegen.sh` |
| `tools/` | `new_machine.py`, `colour_in.py`, `smoke.mjs`, `screenshots.mjs`, `perf.mjs` (frame times and blur through every zoom) |
| `build.py` | builds everything into `dist/` |
| `docs/SPACES.md` | the zoom tree: how spaces nest (map → body → skin → cell) and how it grows in both directions |
| `lab/` | five ways to make the pictures, compared on the same demo (`lab/README.md`); experiments, not the live site |
