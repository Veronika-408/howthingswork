// Screenshots for the edit test: node tools/editshots.mjs <tag> [query]
//   saves shots/edit-<tag>-*.jpg: the town, the bus stop up close, the dive into the person (mid-flight),
//   the plane page's flight-deck inset, the flight deck, the captain up close.
import { launch } from "../../../tools/browser.mjs";
const tag = process.argv[2], q = process.argv[3] || "";
const OUT = new URL("../shots/", import.meta.url).pathname;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const open = async (id, slow = 1) => {
  await page.goto(`http://localhost:8766/v4-encyclopedia-page/?age=7&slowmo=${slow}${q ? "&" + q : ""}&v=${Math.random()}#${id}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__lab && window.__lab.space && window.__lab.idle(), null, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 500));
};
const shot = async name => page.screenshot({ path: `${OUT}edit-${tag}-${name}.jpg`, quality: 85 });
const focus = async p => { await page.evaluate(p => window.__lab.focus(p), p); await new Promise(r => setTimeout(r, 1400)); };
await open("city"); await shot("1-town");
await focus("people"); await shot("2-busstop");
await open("city", 8);
page.evaluate(() => window.__lab.enter("human"));
await new Promise(r => setTimeout(r, 5200)); await shot("3-dive-mid");
await page.waitForFunction(() => window.__lab.idle(), null, { timeout: 60000 }); await shot("4-human");
await open("plane"); await focus("cockpit"); await shot("5-plane-deck-inset");
await open("pilots"); await shot("6-flightdeck");
await focus("captain"); await shot("7-captain");
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
