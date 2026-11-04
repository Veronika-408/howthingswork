// Smoothness check: drives a real (headed, GPU) Chrome through every kind of zoom and reports, per scenario,
// frame times and how blurry the picture at the screen centre got ("blur" = device pixels per source pixel;
// above ~1.6 it looks soft). Serve dist/ on :8765 first.   node tools/perf.mjs [phone] [scenario…]
import { launch } from "./browser.mjs";
const args = process.argv.slice(2);
const phone = args.includes("phone");
const only = args.filter(a => a !== "phone");
const URL = process.env.URL || "http://localhost:8765/";

const wait = ms => new Promise(r => setTimeout(r, ms));
const V = (page, f, ...a) => page.evaluate(f, ...a);
const settle = page => page.waitForFunction(() => !document.body.classList.contains("entering"), null, { timeout: 15000 }).then(() => wait(400));

const SCENARIOS = {
  async body(page) {                                   // city → body → skin → cell → back up
    await V(page, () => __viewer.enter("body")); await settle(page);
    await V(page, () => __viewer.enter("skin")); await settle(page);
    await V(page, () => __viewer.enter("cell")); await settle(page);
    for (let i = 0; i < 3; i++) { await V(page, () => __viewer.leave()); await settle(page); await wait(1300); }
  },
  async plane(page) {                                  // city → plane → engine → fan → out
    await V(page, () => __viewer.enter("plane")); await settle(page);
    await V(page, () => __viewer.focus("engine")); await wait(1600);
    const sub = await V(page, () => Object.keys(__viewer.nodes).find(k => k.startsWith("engine.")));
    if (sub) { await V(page, id => __viewer.focus(id), sub); await wait(1700); }
    await V(page, () => __viewer.unfocus(true)); await wait(1300);
    await V(page, () => __viewer.leave()); await settle(page); await wait(1300);
  },
  async tram(page) {
    await V(page, () => __viewer.enter("tram")); await settle(page);
    const p = await V(page, () => Object.keys(__viewer.nodes).find(k => __viewer.nodes[k].children.length));
    await V(page, id => __viewer.focus(id), p); await wait(1600);
    const c = await V(page, id => __viewer.nodes[id].children[0], p);
    await V(page, id => __viewer.focus(id), c); await wait(1700);
    await V(page, () => __viewer.leaveAll()); await wait(1500);
  },
  async weather(page) {                               // into the sky, a part, and back
    await V(page, () => __viewer.enter("weather")); await settle(page);
    await V(page, () => __viewer.focus("lightning")); await wait(1600);
    await V(page, () => __viewer.unfocus(true)); await wait(1300);
    await V(page, () => __viewer.leave()); await settle(page); await wait(1300);
  },
  async wheel(page) {                                  // free zoom with the wheel: into the map, then into a plate
    const vp = page.viewportSize();
    await page.mouse.move(vp.width * .5, vp.height * .5);
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, -60); await wait(16); }
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 60); await wait(16); }
    await V(page, () => __viewer.enter("plane")); await settle(page);
    for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, -60); await wait(16); }
    await wait(800);
    for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, 60); await wait(16); }
    await wait(800);
  },
};

const browser = await launch({ headless: false, args: ["--enable-gpu-rasterization", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext(phone
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const results = {};
for (const [name, run] of Object.entries(SCENARIOS)) {
  if (only.length && !only.includes(name)) continue;
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    window.__perf = []; window.__frames = [];
    let last = 0; const f = now => { if (last) window.__frames.push([now, now - last]); last = now; requestAnimationFrame(f); }; requestAnimationFrame(f);
    window.__loaf = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__loaf.push({ t: e.startTime, d: e.duration, block: e.blockingDuration,
      render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0, style: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
      scripts: e.scripts.map(s => `${s.invoker}|${s.sourceFunctionName}|${Math.round(s.duration)}|fl${Math.round(s.forcedStyleAndLayoutDuration)}`) }); })
      .observe({ type: "long-animation-frame", buffered: false }); } catch (e) {}
  });
  await page.goto(URL + "?perf=" + Date.now() + (process.env.Q || ""), { waitUntil: "networkidle" });
  if (process.env.CSS) await page.addStyleTag({ content: process.env.CSS });   // experiments: hide a layer, see what it costs
  await wait(2500);
  await V(page, () => { window.__perf.length = 0; window.__frames.length = 0; window.__t0 = performance.now(); });
  await run(page);
  const r = await V(page, () => {
    // only frames while something was changing on screen count (idle frames are free)
    const draws = window.__perf, frames = window.__frames.filter(([t]) => draws.some(d => Math.abs(d.t - t) < 40));
    const d = frames.map(f => f[1]).sort((a, b) => a - b), q = p => d.length ? +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1) : 0;
    let soft = 0, softFrames = 0, worst = 0;
    for (let i = 1; i < draws.length; i++) { const b = draws[i].blur; worst = Math.max(worst, b); if (b > 1.6) { soft += Math.min(50, draws[i].t - draws[i - 1].t); softFrames++; } }
    const softAt = []; for (let i = 1; i < draws.length; i++) if (draws[i].blur > 1.6 && (!softAt.length || draws[i].t - softAt[softAt.length - 1].t1 > 100)) softAt.push({ t0: draws[i].t, t1: draws[i].t, b: draws[i].blur, sp: draws[i].space, dv: draws[i].dive }); else if (draws[i].blur > 1.6) { const z = softAt[softAt.length - 1]; z.t1 = draws[i].t; z.b = Math.max(z.b, draws[i].blur); }
    window.__softAt = softAt.map(z => `${Math.round(z.t0 - window.__t0)}+${Math.round(z.t1 - z.t0)}ms ${z.sp}${z.dv ? " dive" + z.dv : ""} ${z.b.toFixed(1)}`);
    return { frames: d.length, p50: q(.5), p95: q(.95), p99: q(.99), max: q(1), dropped: d.filter(x => x > 25).length, long: d.filter(x => x > 50).length,
      worstBlur: +worst.toFixed(2), softMs: Math.round(soft) };
  });
  if (process.env.SOFT) console.log(JSON.stringify(await V(page, () => window.__softAt)));
  if (process.env.LOAF) console.log(JSON.stringify(await V(page, ms => window.__loaf.filter(e => e.d > ms).map(e => ({ ...e, t: Math.round(e.t - window.__t0), d: Math.round(e.d), render: Math.round(e.render), style: Math.round(e.style) })), +(process.env.LOAFMS || 60)), null, 0));
  results[name] = { ...r, errors: errors.length ? errors : undefined };
  console.log(name.padEnd(6), JSON.stringify(results[name]));
  await page.close();
}
await browser.close();
