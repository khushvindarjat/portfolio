// Renders a terminal-style still for the File Manager CLI project (it has no live demo).
// Uses the exact prompts printed by File_handling/work.py.
import { chromium } from "playwright";
const html = `<!doctype html><html><body style="margin:0;background:#07080d;display:grid;place-items:center;height:100vh;font-family:'JetBrains Mono',Menlo,monospace">
<div style="width:1100px;border:1px solid #1d2233;border-radius:14px;background:#0b0d14;box-shadow:0 40px 120px #000">
<div style="display:flex;gap:8px;padding:16px 18px;border-bottom:1px solid #1d2233"><i style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></i><i style="width:12px;height:12px;border-radius:50%;background:#febc2e"></i><i style="width:12px;height:12px;border-radius:50%;background:#28c840"></i><span style="color:#5b6378;font-size:13px;margin-left:12px">python3 work.py</span></div>
<pre style="margin:0;padding:28px 32px;color:#c9d1e6;font-size:22px;line-height:1.6">
<span style="color:#5ce1e6">$</span> python3 work.py
press 1 for creating a file
press 2 for reading a file
press 3 for updating a file
press 4 for deletion a file
please tell your response:- <span style="color:#fff">1</span>
1 : work.py
please tell your file name:- <span style="color:#fff">notes.txt</span>
what you want to write in this file:- <span style="color:#fff">hello world</span>
<span style="color:#a78bfa">FILE CREATED SUCCESSFULLY</span>
<span style="color:#5ce1e6">$</span> <span style="background:#c9d1e6">&nbsp;</span></pre></div></body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.setContent(html);
await p.screenshot({ path: "public/projects/file-manager.png" });
await b.close();
