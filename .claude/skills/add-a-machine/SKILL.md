---
name: add-a-machine
description: Use when adding a new machine, vehicle or mechanism to howthings.work, colouring a grey thing in on its map, adding "How it works" pages to a machine, or preparing a pull request for this repository.
---

# Add a machine to howthings.work

The method for the pictures lives in the `infinite-book-explainer` skill (virpo/agent-skills). This skill
is the project layer on top: where things go, and what a reviewer will check.

## Workflow

1. Check it's free: `subjects/*/subject.json`, `soon` in `world/src/world.js`,
   `gh pr list --repo virpo/howthingswork --state open`. Claim it with a draft pull request.
2. `python3 tools/new_machine.py <id> "<The Title>" <grey id it replaces>`. Fill `credit` with the user's name and link.
3. Follow `docs/ADD-A-MACHINE.md` steps 2 to 8: plate, parts, deep zoom, colour-in, book pages, checks, pull request.
   Prompt templates are in `docs/prompts/README.md`. Use them word for word around your machine-specific lines.
4. Build, serve `dist/`, run `node tools/smoke.mjs` and `node tools/screenshots.mjs <id>`, and look at the screenshots.

## Checklist a reviewer uses

- [ ] Plate: one coherent cut-away, ink and watercolour, ivory paper, empty margins, no text, counts right, faces the way the map drawing faces.
- [ ] 8 to 14 parts with accurate outlines; each has a close-up, checked facts and a "Can you find it?" line.
- [ ] Every zoom tile matches its source (nothing moved, added or lost).
- [ ] Map: only `world/colour.png` changed the map. The machine is in colour, everything around it stays grey, and the zoom into the plate lands without a jump (`axis`/`plateAxis`).
- [ ] At least one "How it works" page the child can operate, if the machine has a mechanism worth showing.
- [ ] `node tools/smoke.mjs` prints no errors, and the screenshots for desktop and phone are in the pull request.
- [ ] Only `subjects/<id>/` changed.

## Pitfalls

- Image models miscount wheels, engines, blades and seats, and invent text. Check at full size, every time.
- Grey white paint looks like paper. If the machine is white, keep `open_sky` false, so the build keeps its white areas.
- `colour_in.py cut` keeps only what turned colourful. If it grabs too much, make the edit prompt stricter and paint again.
- Use `mechanisms.js` helpers from `window.MECH_KIT`, and assets from `assets/<id>/book/`.
