// Every part of every space, focused, as a contact sheet per space: node tools/parts.mjs outdir [space...]
import { launch } from "../../../tools/browser.mjs";
const [out, ...only] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 1 });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const w = ms => new Promise(r => setTimeout(r, ms));
const spaces = only.length ? only : ["city", "plane", "pilots", "drive", "human", "skin", "cell", "lysosome"];
for (const sp of spaces) {
  await p.goto(`http://localhost:8766/v3-sticker-kit/?age=7&s=${sp}#${sp}`, { waitUntil: "load" });
  await p.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 30000 });
  await w(800);
  const parts = await p.evaluate(() => [...document.querySelectorAll("#lab-hots .hot")].map(e => e.dataset.part));
  for (const id of parts) { await p.evaluate(x => window.__lab.focus(x), id); await w(1300); await p.screenshot({ path: `${out}/part-${sp}-${id}.jpg`, quality: 60 }); }
}
console.log(JSON.stringify(errs));
await b.close();
