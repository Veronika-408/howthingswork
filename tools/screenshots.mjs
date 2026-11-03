// Screenshots for a pull request: the machine in colour on the map (with its hover line), its plate,
// a part close-up and each of its "How it works" pages, on desktop and on a phone.
//   node tools/screenshots.mjs <machine id> [base url]      -> subjects/<id>/screenshots/*.jpg
import { launch } from "./browser.mjs";
import { mkdirSync } from "node:fs";
const [,, id, base = "http://localhost:8765/"] = process.argv;
if (!id) { console.error("usage: node tools/screenshots.mjs <machine id> [base url]"); process.exit(1); }
const out = new URL(`../subjects/${id}/screenshots/`, import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const browser = await launch();
const shots = [];
for (const [dev, vp] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
  const { width, height, ...rest } = vp;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, ...rest });
  await page.goto(base, { waitUntil: "load" });
  await page.waitForFunction(i => window.__viewer && window.__viewer.subjects[i], id, { timeout: 60000 }).catch(() => { throw new Error(`"${id}" is not on the map: check subjects/${id}/subject.json and rebuild`); });
  await page.waitForTimeout(2500);
  const save = async name => { const f = `${out}${dev}-${name}.jpg`; await page.screenshot({ path: f, type: "jpeg", quality: 82 }); shots.push(f); };
  const spot = await page.$(`.whot[data-world="subject:${id}"]`);
  if (dev === "desktop" && spot) { const b = await spot.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(300); }
  await save("1-map");
  await page.evaluate(i => window.__viewer.enter(i), id); await page.waitForTimeout(3000);
  await save("2-plate");
  const parts = await page.evaluate(() => Object.keys(window.__viewer.nodes));
  await page.evaluate(p => window.__viewer.focus(p), parts[0]); await page.waitForTimeout(2200);
  await save("3-part");
  const deep = parts.find(p => p.includes("."));
  if (deep) { await page.evaluate(p => window.__viewer.focus(p), deep); await page.waitForTimeout(2400); await save("4-inside"); }
  if (dev === "desktop") {
    const how = await page.evaluate(i => window.SUBJECTS[i].how && window.SUBJECTS[i].how.part || {}, id);
    for (const mech of Object.keys(how)) {
      await page.goto(`${base}?s=${mech}#how-${mech}`, { waitUntil: "load" }); await page.waitForTimeout(4500);
      await save(`5-how-${mech}`);
    }
  }
  await page.close();
}
await browser.close();
console.log(shots.map(f => f.replace(/.*\/subjects\//, "subjects/")).join("\n"));
