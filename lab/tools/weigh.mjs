// What a visitor downloads walking both chains of each variant (all spaces).   node lab/tools/weigh.mjs [variant…]
import { launch } from "../../tools/browser.mjs";
const all = ["v1-patchwork", "v2-paper-theatre", "v3-sticker-kit", "v4-encyclopedia-page", "v5-ink-and-wash"];
const list = process.argv.slice(2).length ? process.argv.slice(2) : all;
const browser = await launch(), out = {};
for (const v of list) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  let bytes = 0, n = 0;
  page.on("response", async r => { try { const b = await r.body(); bytes += b.length; n++; } catch (e) {} });
  try {
    await page.goto(`http://localhost:8766/${v}/`, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => window.__lab && window.__lab.space, null, { timeout: 30000 });
    for (const id of ["plane", "pilots", "drive", "human", "skin", "cell", "lysosome", "city"]) {
      await page.evaluate(id => window.__lab.enter(id), id).catch(() => {});
      await page.waitForFunction(() => window.__lab.idle(), null, { timeout: 30000 }).catch(() => {});
    }
    await new Promise(r => setTimeout(r, 2500));
    out[v] = { mb: +(bytes / 1e6).toFixed(1), requests: n };
  } catch (e) { out[v] = { error: e.message.slice(0, 120) }; }
  await page.close();
}
await browser.close();
console.log(JSON.stringify(out));
