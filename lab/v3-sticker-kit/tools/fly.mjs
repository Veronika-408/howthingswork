// Fly: node tools/fly.mjs out-prefix  (screenshots at several control settings)
import { launch } from "../../../tools/browser.mjs";
const out = process.argv[2];
const b = await launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(`http://localhost:8766/v3-sticker-kit/?age=7#drive`, { waitUntil: "load" });
await p.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 30000 });
const w = ms => new Promise(r => setTimeout(r, ms));
const sets = [["level", { yoke: { x: 0, y: 0 }, throttle: .6 }], ["left-climb", { yoke: { x: -1, y: .8 }, throttle: 1, flaps: .5 }], ["right-dive", { yoke: { x: 1, y: -1 }, throttle: .1, gear: 1, flaps: 1 }]];
for (const [n, v] of sets) { await p.evaluate(v => window.__lab.drive.set(v), v); await w(2500); await p.screenshot({ path: `${out}-${n}.jpg`, quality: 75 }); }
console.log(JSON.stringify(errs));
await b.close();
