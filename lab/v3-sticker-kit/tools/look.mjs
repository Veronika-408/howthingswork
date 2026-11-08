// Quick look at one space: node tools/look.mjs <space> [out.jpg] [w] [h] [focus-part]
import { launch } from "../../../tools/browser.mjs";
const [space = "city", out = "/tmp/look.jpg", w = 1440, h = 900, part, extra = ""] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1.5 });
const errs = [];
p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text()); });
p.on("response", r => { if (r.status() >= 400) errs.push(r.status() + " " + r.url()); });
await p.goto(`http://localhost:8766/v3-sticker-kit/?age=7${extra}#${space}`, { waitUntil: "load" });
await p.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 30000 }).catch(e => errs.push("not idle"));
await new Promise(r => setTimeout(r, 1200));
if (part && part.startsWith("zoom:")) { const [x, y, z] = part.slice(5).split(",").map(Number); await p.evaluate(([x, y, z]) => { const c = window.__lab.cam; /* zoom by wheel events */ }, [x, y, z]); }
else if (part && part !== "-") { await p.evaluate(x => window.__lab.focus(x), part); await new Promise(r => setTimeout(r, 1400)); }
await p.screenshot({ path: out, quality: 85, type: "jpeg" });
console.log(JSON.stringify(errs.slice(0, 10)));
await b.close();
