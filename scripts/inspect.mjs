// Dev helper: loads the site in Chromium, captures console errors, screenshots and FPS.
// Usage: node scripts/inspect.mjs [url] [outDir] [--mobile] [--steps=hero,about,...]
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";

const url = process.argv[2] || "http://localhost:3000/";
const out = process.argv[3] || "shots";
const mobile = process.argv.includes("--mobile");
const stepsArg = process.argv.find((a) => a.startsWith("--steps="));
const steps = stepsArg ? stepsArg.slice(8).split(",") : [];
const introShots = process.argv.includes("--intro");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext(
  mobile ? { ...devices["iPhone 14 Pro"], deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
);
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded" });
if (introShots) {
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${out}/intro-${String(i).padStart(2, "0")}.png` });
  }
} else {
  await page.waitForTimeout(6000);
}
await page.screenshot({ path: `${out}/hero.png` });
const info = await page.evaluate(() => ({ fps: window.__fps, gl: (() => { const c = document.createElement("canvas").getContext("webgl2"); const d = c?.getExtension("WEBGL_debug_renderer_info"); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : "n/a"; })() }));
console.log("load+intro ms", Date.now() - t0, info);

for (const id of steps) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + (id === "projects" ? 0 : 0));
  }, id);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/${id}.png` });
  console.log(id, "fps", await page.evaluate(() => window.__fps));
}
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
