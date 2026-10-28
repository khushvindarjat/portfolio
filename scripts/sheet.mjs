// Dev helper: tiles PNG screenshots into one contact sheet. Usage: node scripts/sheet.mjs out.png a.png b.png ...
import sharp from "sharp";
const [out, ...files] = process.argv.slice(2);
const W = 480, H = 300, cols = 5;
const tiles = await Promise.all(files.map((f) => sharp(f).resize(W, H, { fit: "contain", background: "#000" }).png().toBuffer()));
const rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: W * Math.min(cols, tiles.length), height: H * rows, channels: 3, background: "#222" } })
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * W, top: Math.floor(i / cols) * H })))
  .png()
  .toFile(out);
