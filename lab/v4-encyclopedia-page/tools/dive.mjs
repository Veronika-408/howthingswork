// Watch a dive frame by frame: node tools/dive.mjs <outdir> <parent> <child> [frames=6] [slowmo=8] [--up] [--phone]
import { launch } from "../../../tools/browser.mjs";
const [out, parent, child, nf = "6", sm = "8"] = process.argv.slice(2).filter(a => !a.startsWith("--"));
const up = process.argv.includes("--up"), phone = process.argv.includes("--phone");
const browser = await launch();
const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(`http://localhost:8766/v4-encyclopedia-page/?age=7&slowmo=${sm}&v=${Math.random()}#${up ? child : parent}`, { waitUntil: "load" });
await page.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));
const t0 = Date.now();
page.evaluate(([c, u]) => u ? window.__lab.leave() : window.__lab.enter(c), [child, up]);
const total = +(process.env.DUR || 1800 * +sm * .95);
for (let i = 0; i < +nf; i++) {
  const at = 300 + i * (total / (+nf - 1));
  const wait = at - (Date.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));
  await page.screenshot({ path: `${out}/dive-${up ? "up-" : ""}${child}-${i}.png` });
}
await page.waitForFunction(() => window.__lab.idle(), null, { timeout: 60000 });
await page.screenshot({ path: `${out}/dive-${up ? "up-" : ""}${child}-end.png` });
console.log(errors.length ? errors.join("\n") : "no errors", await page.evaluate(() => window.__lab.space));
await browser.close();
