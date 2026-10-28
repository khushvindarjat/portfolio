// Converts public/projects/*.png to resized WebP (1280px wide) for fast loading.
import sharp from "sharp";
import { readdir, unlink } from "node:fs/promises";
const dir = "public/projects";
for (const f of await readdir(dir)) {
  if (!f.endsWith(".png")) continue;
  const out = `${dir}/${f.replace(".png", ".webp")}`;
  await sharp(`${dir}/${f}`).resize(1280, 800, { fit: "cover", position: "top" }).webp({ quality: 78 }).toFile(out);
  await unlink(`${dir}/${f}`);
  console.log("→", out);
}
