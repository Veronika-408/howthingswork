// Quick look at pages while laying them out: screenshots of spaces, and every console error.
//   node tools/look.mjs <outdir> <space[:focusPart]>... [--phone] [--hots] [--zoom=2]
import { launch } from "../../../tools/browser.mjs";
const args = process.argv.slice(2);
const out = args[0];
const phone = args.includes("--phone"), hots = args.includes("--hots");
const zoomArg = args.find(a => a.startsWith("--zoom="));
const spaces = args.slice(1).filter(a => !a.startsWith("--"));
const browser = await launch();
const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: phone ? 2 : 1.5, isMobile: phone, hasTouch: phone });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("response", r => { if (r.status() >= 400) errors.push(r.status() + " " + r.url()); });
for (const sp of spaces) {
  const [id, part] = sp.split(":");
  await page.goto(`http://localhost:8766/v4-encyclopedia-page/?age=7&v=${Math.random()}#${id}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 30000 });
  if (hots) await page.addStyleTag({ content: "#lab-hots .hot{stroke:#e03!important;fill:rgba(255,0,60,.12)!important}" });
  if (part) { await page.evaluate(p => window.__lab.focus(p), part); }
  if (zoomArg) await page.evaluate(z => { const c = window.__lab.cam; }, +zoomArg.split("=")[1]);
  await new Promise(r => setTimeout(r, part ? 1400 : 600));
  await page.screenshot({ path: `${out}/${phone ? "p-" : ""}${id}${part ? "-" + part : ""}${hots ? "-hots" : ""}.png` });
}
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
