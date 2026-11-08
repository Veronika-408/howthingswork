// Quick looks while building:  node tools/snap.mjs <out.jpg> <hash> [--phone] [--js "code run after load"] [--wait ms]
// Several frames of a dive:     node tools/snap.mjs <out-prefix> <hash> --dive <child> [--frames 6] [--slowmo 8]
import { launch } from "../../../tools/browser.mjs";
const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const out = a[0], hash = a[1] || "city", phone = a.includes("--phone");
const browser = await launch();
const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text()); });
const slow = opt("--slowmo", null);
await page.goto(`${process.env.LAB_URL || "http://localhost:8767/"}v2-paper-theatre/?age=7${slow ? "&slowmo=" + slow : ""}#${hash}`, { waitUntil: "load" });
await page.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 60000 });
await new Promise(r => setTimeout(r, 600));
const js = opt("--js", null);
if (js) { await page.evaluate(js); await new Promise(r => setTimeout(r, +opt("--wait", 1500))); }
const dive = opt("--dive", null);
if (dive) {
  const n = +opt("--frames", 6), gap = +opt("--gap", 700);
  page.evaluate(d => d === ".." ? window.__lab.leave() : window.__lab.enter(d), dive).catch(() => {});
  for (let i = 0; i < n; i++) { await new Promise(r => setTimeout(r, gap)); await page.screenshot({ path: `${out}-${i}.jpg`, quality: 80 }); }
} else await page.screenshot({ path: out, quality: 85 });
if (errs.length) console.log("ERRORS:", errs.join("\n"));
await browser.close();
