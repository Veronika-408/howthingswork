// List every file a visitor's browser loads in each variant (all spaces, every part, flying), so only those are committed.
//   node lab/tools/shipped.mjs → writes lab/<variant>/SHIPPED.txt
import { launch } from "../../tools/browser.mjs";
import { writeFileSync } from "node:fs";
const all = ["v1-patchwork", "v2-paper-theatre", "v3-sticker-kit", "v4-encyclopedia-page", "v5-ink-and-wash"];
const list = process.argv.slice(2).length ? process.argv.slice(2) : all;
const browser = await launch();
for (const v of list) {
  const seen = new Set();
  for (const vp of [{ width: 1440, height: 900, d: 2 }, { width: 390, height: 844, d: 3 }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.d });
    page.on("request", r => { const u = new URL(r.url()); if (u.host === "localhost:8766") seen.add(decodeURIComponent(u.pathname)); });
    await page.goto(`http://localhost:8766/${v}/`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 60000 });
    for (const id of ["plane", "pilots", "drive", "human", "skin", "cell", "lysosome", "city"]) {
      await page.evaluate(id => window.__lab.enter(id), id).catch(() => {});
      await page.waitForFunction(() => window.__lab.idle(), null, { timeout: 30000 }).catch(() => {});
      const parts = await page.evaluate(() => [...document.querySelectorAll("#lab-hots .hot")].map(e => e.dataset.part));
      for (const p of parts) await page.evaluate(p => window.__lab.focus(p), p);
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__lab.unfocus());
    }
    await page.goto(`http://localhost:8766/${v}/?edit=before`, { waitUntil: "load" }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.close();
  }
  const files = [...seen].filter(p => p.startsWith(`/${v}/`)).map(p => p.slice(v.length + 2)).filter(Boolean).sort();
  writeFileSync(new URL(`../${v}/SHIPPED.txt`, import.meta.url), files.join("\n") + "\n");
  console.log(v, files.length);
}
await browser.close();
