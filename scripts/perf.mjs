// Measures first-load weight, paint timing and FPS during a continuous scroll.
// Usage: node scripts/perf.mjs [url] [--mobile]
import { chromium, devices } from "playwright";
const url = process.argv[2] || "http://localhost:3001/";
const mobile = process.argv.includes("--mobile");
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext(mobile ? { ...devices["iPhone 14 Pro"] } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
if (mobile) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
let bytes = 0, bytesBeforeScene = 0, sceneStarted = false;
cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; if (!sceneStarted) bytesBeforeScene += e.encodedDataLength; });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const t0 = Date.now();
await page.goto(url, { waitUntil: "load" });
const paint = await page.evaluate(() => Object.fromEntries(performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)])));
sceneStarted = true;
await page.waitForFunction(() => document.querySelector("canvas"), null, { timeout: 20000 });
const canvasAt = Date.now() - t0;
await page.waitForTimeout(5500);
const q = await page.evaluate(() => document.querySelector("canvas") ? { w: document.querySelector("canvas").width, h: document.querySelector("canvas").height } : null);
// Continuous scroll through the page while sampling FPS.
const samples = [];
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const steps = 60;
for (let i = 0; i <= steps; i++) {
  await page.mouse.move(400 + Math.sin(i / 3) * 300, 450 + Math.cos(i / 4) * 200);
  await page.evaluate((y) => window.scrollTo(0, y), (total * i) / steps);
  await page.waitForTimeout(250);
  if (i % 2 === 0) samples.push(await page.evaluate(() => window.__fps || 0));
}
samples.sort((a, b) => a - b);
const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
console.log(JSON.stringify({ mobile, paint, canvasAtMs: canvasAt, initialKB: Math.round(bytesBeforeScene / 1024), totalKB: Math.round(bytes / 1024), canvas: q, fps: { avg: Math.round(avg), min: samples[0], p10: samples[Math.floor(samples.length * 0.1)] } }));
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
