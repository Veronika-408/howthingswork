// Quick look: open a space (optionally run steps) and save a screenshot.
//   node lab/v1-patchwork/tools/look.mjs <out.jpg> <hash> [js to run before the shot] [--phone] [--wait ms]
import { launch } from "../../../tools/browser.mjs";
const [out, hash, js] = process.argv.slice(2);
const phone = process.argv.includes("--phone");
const wi = process.argv.indexOf("--wait"); const waitMs = wi > 0 ? +process.argv[wi + 1] : 900;
const b = await launch();
const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: phone ? 2 : 1.5, isMobile: phone, hasTouch: phone });
const errs = [];
p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(`${process.env.LAB_URL || "http://localhost:8766/"}v1-patchwork/?age=7#${hash}`, { waitUntil: "load" });
await p.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 60000 });
if (js && !js.startsWith("--")) { await p.evaluate(js); }
const zi = process.argv.indexOf("--zoom");          // --zoom x,y,steps : wheel-zoom at space point (x, y)
if (zi > 0) {
  const [zx, zy, steps] = process.argv[zi + 1].split(",").map(Number);
  await new Promise(r => setTimeout(r, 400));
  for (let i = 0; i < steps; i++) {
    const c = await p.evaluate(() => window.__lab.cam);
    await p.mouse.move(c.x + c.s * zx, c.y + c.s * zy);
    await p.mouse.wheel(0, -240);
    await new Promise(r => setTimeout(r, 60));
  }
  const c = await p.evaluate(() => window.__lab.cam);           // finally centre-ish: drag the point to the middle of the picture area
  await new Promise(r => setTimeout(r, 300));
}
await new Promise(r => setTimeout(r, waitMs));
await p.waitForFunction(() => window.__lab.idle(), null, { timeout: 30000 }).catch(() => errs.push("not idle"));
await p.screenshot({ path: out, quality: 85 });
console.log(JSON.stringify({ space: await p.evaluate(() => window.__lab.space), errs }));
await b.close();
