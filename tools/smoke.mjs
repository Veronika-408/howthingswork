// Smoke test: city -> each machine -> every part -> back to the city, plus every "How it works" page.
//   node tools/smoke.mjs [base url, default http://localhost:8765/]   (serve dist/ first)
import { launch } from "./browser.mjs";
const base = process.argv[2] || "http://localhost:8765/";
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("response", r => { if (r.status() >= 400) errors.push(r.status() + " " + r.url().replace(base, "")); });
await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.__viewer && window.__viewer.idle(), null, { timeout: 240000 });   // everything planned is fetched
const out = {};
for (const sid of Object.keys(await page.evaluate(() => window.__viewer.subjects))) {
  await page.evaluate(id => window.__viewer.enter(id), sid); await page.waitForTimeout(2600);
  const ids = await page.evaluate(() => Object.keys(window.__viewer.nodes));
  for (const id of ids) { await page.evaluate(i => window.__viewer.focus(i), id); await page.waitForTimeout(200); }
  await page.evaluate(() => window.__viewer.unfocus(true)); await page.waitForTimeout(1200);
  await page.evaluate(() => window.__viewer.leaveAll()); await page.waitForTimeout(6500);
  out[sid] = { parts: ids.length, backInCity: await page.evaluate(() => window.__viewer.space === null) };
}
for (const m of await page.evaluate(() => Object.keys(window.MECHANISMS))) {
  await page.goto(base + "?b=" + m + "#how-" + m, { waitUntil: "networkidle" }); await page.waitForTimeout(2800);
  out["book:" + m] = await page.evaluate(() => window.BOOK.current);
}
console.log(JSON.stringify({ ...out, errors: errors.slice(0, 10) }));
await browser.close();
