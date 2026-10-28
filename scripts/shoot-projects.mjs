// Captures screenshots of live project demos into public/projects.
// Usage: node scripts/shoot-projects.mjs
import { chromium } from "playwright";

const targets = [
  ["coderoller", "https://code-roller-website.vercel.app"],
  ["flowpilot", "https://flowpilot-omega-woad.vercel.app"],
  ["archon", "https://project-archon-jet.vercel.app"],
  ["novastudios", "https://archonbugs1.vercel.app"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
for (const [name, url] of targets) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `public/projects/${name}.png` });
    console.log("ok", name, page.url());
  } catch (e) {
    console.log("fail", name, e.message);
  }
}
await browser.close();
