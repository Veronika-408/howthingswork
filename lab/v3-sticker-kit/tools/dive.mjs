// Watch a dive frame by frame: node tools/dive.mjs <from> <to> <outprefix> [frames] [slowmo]
import { launch } from "../../../tools/browser.mjs";
const [from, to, out, n = 6, slow = 6, w = 1440, h = 900] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(`http://localhost:8766/v3-sticker-kit/?age=7&slowmo=${slow}#${from}`, { waitUntil: "load" });
await p.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 30000 });
await new Promise(r => setTimeout(r, 2500));
const t0 = Date.now();
p.evaluate(id => window.__lab.enter(id), to);
const total = 1800 * slow;
for (let i = 0; i < +n; i++) { await new Promise(r => setTimeout(r, Math.max(0, t0 + (i + 1) * total / (+n + 1) - Date.now()))); await p.screenshot({ path: `${out}-${i}.jpg`, quality: 70 }); }
await p.waitForFunction(() => window.__lab.idle(), null, { timeout: 30000 });
await p.screenshot({ path: `${out}-end.jpg`, quality: 70 });
console.log(JSON.stringify(errs));
await b.close();
