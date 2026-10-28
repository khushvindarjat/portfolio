// Renders the Open Graph image (public/og.png) from the live particle sculpture.
// Usage: npm run build && npx next start -p 3001, then: node scripts/og.mjs http://localhost:3001/
import { chromium } from "playwright";
const url = process.argv[2] || "http://localhost:3001/";
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(url + "?quality=high", { waitUntil: "load" });
await page.waitForTimeout(7000);
await page.addStyleTag({
  content: `header, #hero .label, #hero button, #hero p, #hero a, nextjs-portal { display: none !important; }
            #hero h1 { font-size: 92px !important; }`,
});
await page.mouse.move(-10, -10);
await page.waitForTimeout(1200);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("wrote public/og.png");
