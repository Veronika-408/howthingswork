// Walk both chains of a lab variant, like a child would, and save screenshots; print every error.
//   node lab/tools/shots.mjs <variant> [--quick]      (serve lab/ on :8766 first)
// Saves lab/<variant>/shots/{desktop,phone}-NN-<what>.jpg and prints a JSON summary.
import { launch } from "../../tools/browser.mjs";
import { mkdirSync } from "node:fs";
const variant = process.argv[2];
if (!variant) { console.error("usage: node lab/tools/shots.mjs <variant> [--quick]"); process.exit(2); }
const quick = process.argv.includes("--quick");
const BASE = (process.env.LAB_URL || "http://localhost:8766/") + variant + "/";
const OUT = new URL(`../${variant}/shots/`, import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await launch();
const errors = [], summary = {};
const wait = ms => new Promise(r => setTimeout(r, ms));
async function run(kind, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: kind === "phone" ? 2 : 1.5, isMobile: kind === "phone", hasTouch: kind === "phone" });
  page.on("pageerror", e => errors.push(`${kind}: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`${kind}: console: ${m.text()}`); });
  page.on("response", r => { if (r.status() >= 400) errors.push(`${kind}: ${r.status()} ${r.url().replace(BASE, "")}`); });
  await page.goto(BASE + "?age=7", { waitUntil: "load" });
  await page.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 60000 });
  let n = 0;
  const shot = async (what, ms = 500) => { await wait(ms); await page.screenshot({ path: `${OUT}${kind}-${String(++n).padStart(2, "0")}-${what}.jpg`, quality: 82 }); };
  const go = id => page.evaluate(id => window.__lab.enter(id), id);
  const idle = () => page.waitForFunction(() => window.__lab.idle(), null, { timeout: 30000 }).catch(() => errors.push(`${kind}: not idle`));
  const tour = async () => {             // open every part of the space (checks outlines and words exist)
    const parts = await page.evaluate(() => [...document.querySelectorAll("#lab-hots .hot")].map(e => e.dataset.part));
    for (const p of parts) await page.evaluate(p => window.__lab.focus(p), p);
    await wait(300); await page.evaluate(() => window.__lab.unfocus()); await wait(700);
    return parts;
  };
  const visited = {};
  await shot("city", 800); if (!quick) visited.city = await tour();
  for (const [id, label] of [["plane", "plane"], ["pilots", "pilots"]]) { await go(id); await idle(); await shot(label); if (!quick) visited[id] = await tour(); }
  await page.evaluate(() => window.__lab.focus("captain")); await shot("pilots-captain", 1100); await page.evaluate(() => window.__lab.unfocus()); await wait(900);
  await go("drive"); await idle(); await shot("drive");
  await page.evaluate(() => window.__lab.drive.set({ yoke: { x: .8, y: .5 }, throttle: .9 })); await shot("drive-banking", 2200);
  await page.evaluate(() => window.__lab.drive.set({ yoke: { x: 0, y: 0 } }));
  if (!quick) visited.drive = await tour();
  await page.evaluate(() => window.__lab.leaveAll()); await idle(); await shot("back-in-city", 600);
  for (const id of ["human", "skin", "cell", "lysosome"]) { await go(id); await idle(); await shot(id); if (!quick) visited[id] = await tour(); }
  for (const a of [3, 11]) { await page.evaluate(a => window.__lab.setAge(a), a); await page.evaluate(() => window.__lab.focus("enzymes")); await shot(`lysosome-age${a}`, 1100); }
  await page.evaluate(() => { window.__lab.unfocus(); window.__lab.setAge(7); });
  await page.evaluate(() => window.__lab.leaveAll()); await idle(); await shot("back-in-city-2", 600);
  if (kind === "desktop") {            // a dive frame by frame (slowed down)
    await page.goto(BASE + "?age=7&slowmo=6", { waitUntil: "load" });
    await page.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 60000 });
    page.evaluate(() => { window.__lab.enter("human"); });
    for (let i = 0; i < 6; i++) { await wait(i ? 1300 : 1500); await page.screenshot({ path: `${OUT}dive-human-${i}.jpg`, quality: 80 }); }
    await idle();
  }
  summary[kind] = { space: await page.evaluate(() => window.__lab.space), parts: Object.fromEntries(Object.entries(visited).map(([k, v]) => [k, v.length])) };
  await page.close();
}
await run("desktop", { width: 1440, height: 900 });
await run("phone", { width: 390, height: 844 });
await browser.close();
console.log(JSON.stringify({ variant, ...summary, errors: errors.slice(0, 30) }, null, 1));
