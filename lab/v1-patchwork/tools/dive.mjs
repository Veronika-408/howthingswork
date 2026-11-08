// Film a dive in slow motion: frames of parent -> child at even times, saved as one contact sheet per dive.
//   node lab/v1-patchwork/tools/dive.mjs <outdir> parent:child [parent:child ...] [--phone] [--frames n]
import { launch } from "../../../tools/browser.mjs";
import { mkdirSync } from "node:fs";
const args = process.argv.slice(2);
const out = args[0]; mkdirSync(out, { recursive: true });
const phone = args.includes("--phone");
const fi = args.indexOf("--frames"); const N = fi > 0 ? +args[fi + 1] : 8;
const pairs = args.slice(1).filter(a => a.includes(":"));
const b = await launch();
const errs = [];
for (const pair of pairs) {
  const [parent, child] = pair.split(":");
  const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
  p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(`${process.env.LAB_URL || "http://localhost:8766/"}v1-patchwork/?age=7&slowmo=10#${parent}`, { waitUntil: "load" });
  await p.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  p.evaluate(c => { window.__done = false; window.__lab.enter(c).then(() => window.__done = true); }, child);
  // a dive lasts up to 1.8 s x slowmo 10 = 18 s
  for (let i = 0; i < N; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 300 : 2000));
    await p.screenshot({ path: `${out}/${parent}-${child}-${i}.jpg`, quality: 70 });
    if (await p.evaluate(() => window.__done)) break;
  }
  await p.close();
}
console.log(JSON.stringify({ errs }));
await b.close();
