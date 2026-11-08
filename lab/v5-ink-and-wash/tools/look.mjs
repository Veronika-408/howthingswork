// Screenshot one space of this variant, optionally zoomed in with the wheel at a point, and print errors + frame times.
//   node tools/look.mjs <space> <out.png> [--zoom N --at x,y (space coords)] [--phone] [--hash extra] [--eval js] [--wait ms]
import { launch } from "../../../tools/browser.mjs";
const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : d; };
const [space, out] = a;
const phone = a.includes("--phone");
const browser = await launch();
const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: phone ? 2 : 1.5, isMobile: phone, hasTouch: phone });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push("console: " + m.text()); });
page.on("response", r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
await page.goto(`http://localhost:8766/v5-ink-and-wash/${opt("--q", "")}#${space}`, { waitUntil: "load" });
await page.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 60000 });
await new Promise(r => setTimeout(r, +opt("--wait", 1500)));
if (opt("--eval")) { await page.evaluate(opt("--eval")); await new Promise(r => setTimeout(r, 1500)); }
const zoom = +opt("--zoom", 0);
if (zoom) {
  // find the screen point of the space point via the hotspot layer's transform: use the canvas fit (frame) by sampling
  const [sx, sy] = opt("--at", "836,470").split(",").map(Number);
  const pt = await page.evaluate(([sx, sy]) => {
    const s = window.LAB_DATA.spaces[window.__lab.space];
    const W = innerWidth, H = innerHeight, phone = W < 700;
    const area = phone ? { x: 8, y: 54, w: W - 16, h: H - 52 - Math.round(H * .38) - 8 } : { x: 18, y: 62, w: W - 378, h: H - 80 };
    const [fx, fy, fw, fh] = s.frame || [0, 0, s.w, s.h];
    const k = Math.min(area.w / fw, area.h / fh);
    return [area.x + (area.w - fw * k) / 2 + (sx - fx) * k, area.y + (area.h - fh * k) / 2 + (sy - fy) * k];
  }, [sx, sy]);
  await page.mouse.move(pt[0], pt[1]);
  for (let i = 0; i < zoom; i++) { await page.mouse.wheel(0, -240); await new Promise(r => setTimeout(r, 120)); }
  await new Promise(r => setTimeout(r, 1500));
}
const ft = null;
await page.screenshot({ path: out });
console.log(JSON.stringify({ space, out, frameMs: ft, errors }));
await browser.close();
