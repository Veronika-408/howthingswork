// Watch dives frame by frame (slow motion) and save a contact sheet per link: node tools/dive.mjs [child ...] [--phone]
import { launch } from "../../../tools/browser.mjs";
import { execFileSync } from "node:child_process";
const a = process.argv.slice(2), phone = a.includes("--phone");
const links = { plane: "city", pilots: "plane", drive: "pilots", human: "city", skin: "human", cell: "skin", lysosome: "cell" };
const kids = a.filter(x => !x.startsWith("--")); const todo = kids.length ? kids : Object.keys(links);
const OUT = new URL("../shots/", import.meta.url).pathname, TMP = process.env.TMPDIR || "/tmp/";
const browser = await launch();
const errors = [];
for (const c of todo) {
  const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
  page.on("pageerror", e => errors.push(c + ": " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(c + ": " + m.text()); });
  await page.goto(`http://localhost:8766/v5-ink-and-wash/?slowmo=10#${links[c]}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__lab && window.__lab.idle(), null, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));
  page.evaluate(id => window.__lab.enter(id), c);
  const files = [];
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 300 : 1900));
    const f = `${TMP}dive-${c}-${i}.png`; await page.screenshot({ path: f }); files.push(f);
    if (await page.evaluate(() => window.__lab.idle())) break;
  }
  await page.close();
  execFileSync("/usr/bin/python3", ["-c", `
import sys
from PIL import Image
fs = sys.argv[2:]; ims = [Image.open(f).convert("RGB") for f in fs]; w, h = ims[0].size; s = .36 if w > 800 else .5
cols = 4; rows = (len(ims) + cols - 1) // cols
out = Image.new("RGB", (int(w * s) * cols, int(h * s) * rows), "white")
for i, im in enumerate(ims): out.paste(im.resize((int(w * s), int(h * s))), ((i % cols) * int(w * s), (i // cols) * int(h * s)))
out.save(sys.argv[1], quality=82)`, `${OUT}dive-${phone ? "phone-" : ""}${c}.jpg`, ...files]);
  console.log("saved", `${OUT}dive-${phone ? "phone-" : ""}${c}.jpg`);
}
console.log(JSON.stringify({ errors }));
await browser.close();
