// Launch Chrome for the checks: $CHROME, else the usual install paths, else Playwright's own Chromium.
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
const candidates = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
export const launch = (opts = {}) => {
  const executablePath = candidates.find(p => existsSync(p));
  return chromium.launch({ ...(executablePath ? { executablePath } : {}), ...opts });
};
