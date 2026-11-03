// Prints hotspots.js and parts.js as JSON for the Python tile tools.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const root = process.argv[2] ? pathToFileURL(process.argv[2].replace(/\/?$/, "/")) : new URL("../src/", import.meta.url);
const window = {};
for (const f of ["parts.js", "hotspots.js", "zoom.js"]) {
  try { new Function("window", readFileSync(new URL(f, root), "utf8"))(window); } catch (e) { if (e.code !== "ENOENT") throw e; }
}
console.log(JSON.stringify({ plate: window.PLATE, spots: window.HOTSPOTS, order: window.ORDER, parts: window.PARTS, zoom: window.ZOOM || {} }));
