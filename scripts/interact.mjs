// Dev helper: exercises hover force-field, hold/explode, project fly-in and skill hover.
import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6500);
// Force field: sweep the mouse through the sculpture.
for (let i = 0; i <= 20; i++) await page.mouse.move(800 + i * 15, 250 + i * 10, { steps: 2 });
await page.waitForTimeout(120);
await page.screenshot({ path: `${out}/i-force.png` });
// Hold → black hole
await page.mouse.move(980, 400);
await page.mouse.down();
await page.waitForTimeout(1600);
await page.screenshot({ path: `${out}/i-hold.png` });
await page.mouse.up();
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/i-explode.png` });
// Projects → open first panel by clicking it
await page.evaluate(() => window.scrollTo(0, document.getElementById("projects").offsetTop));
await page.waitForTimeout(2800);
await page.mouse.move(720, 470, { steps: 5 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/i-panel-hover.png` });
await page.mouse.click(720, 470);
await page.waitForTimeout(2200);
await page.screenshot({ path: `${out}/i-detail.png` });
await page.keyboard.press("Escape");
await page.waitForTimeout(1200);
// Rotate carousel by dragging
await page.mouse.move(1000, 450);
await page.mouse.down();
await page.mouse.move(600, 450, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/i-drag.png` });
// Skills hover
await page.evaluate(() => window.scrollTo(0, document.getElementById("skills").offsetTop));
await page.waitForTimeout(3000);
const pos = await page.evaluate(() => { const b = document.querySelectorAll("#skills button")[4].getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
await page.mouse.move(pos.x, pos.y, { steps: 4 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/i-skill.png` });
console.log("fps", await page.evaluate(() => window.__fps));
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
