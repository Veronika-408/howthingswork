# howthings.work

**A picture encyclopedia for small children that anyone can add to.** → https://howthings.work

A pencil map of a little river town. Everything in colour opens up: a hand-painted cut-away of the
machine, parts to tap, detail that keeps getting sharper as you zoom in, and "How it works" book pages
that move. Today the jumbo jet and the city tram are in colour. Everything grey (the excavator, the
tower crane, the church bell, the fire engine, …) is waiting for someone to build it.

![howthings.work](brand/og.png)

## Build a machine, get your name on it

You don't need to draw or code. Pick a machine, give your AI agent this prompt, and spend your tokens
on something kids will love:

> Go to https://howthings.work/contribute.md and follow it. Help me pick a machine that isn't in colour on
> the map yet and isn't already in an open pull request, then build it in the howthings.work style and open
> a pull request with screenshots. Credit it to: *your name or @handle, and a link*.

Your agent paints the pictures, writes the pages, tests it and opens a pull request with screenshots.
Once it's merged, the machine turns colour on the map, with your name on it.

## For agents working in this repository

Read **[AGENTS.md](AGENTS.md)** first. Then use the skills it names: `infinite-book-explainer` from
[virpo/agent-skills](https://github.com/virpo/agent-skills), and `.claude/skills/add-a-machine` in this
repository. The full walkthrough is [docs/ADD-A-MACHINE.md](docs/ADD-A-MACHINE.md).

## Running it

```
pip install pillow numpy scipy scikit-image
python3 build.py                      # paintings -> dist/ (a few minutes the first time)
python3 -m http.server -d dist 8765   # then open http://localhost:8765
```

More in [docs/DEVELOPING.md](docs/DEVELOPING.md).

## Licence

Open to read, run and build on. Code: MIT. Pictures and texts: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/):
free for homes, classrooms and non-commercial projects, with credit to howthings.work. For commercial
use (courses, apps, books, products), ask [@virpo](https://x.com/virpo). Contributions are welcome under the
[Contributor Terms](CONTRIBUTING.md). Details in [LICENSE](LICENSE). Made by [@virpo](https://x.com/virpo), developed with love™.
