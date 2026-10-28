import * as THREE from "three";
import { SHAPES, buildShape } from "@/lib/shapes";
import { projects } from "@/content/data";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Builds the particle target shapes (CPU, chunked so the loader keeps animating). */
export async function buildTargets(count: number, onStep: (p: number) => void) {
  const out: Float32Array[] = [];
  for (let i = 0; i < SHAPES.length; i++) {
    await nextFrame();
    out.push(buildShape(SHAPES[i], count));
    onStep((i + 1) / SHAPES.length);
  }
  return out;
}

/** Loads project screenshots as mipmapped sRGB textures. */
export async function loadTextures(onStep: (p: number) => void) {
  const loader = new THREE.TextureLoader();
  let done = 0;
  return Promise.all(
    projects.map(
      (p) =>
        new Promise<THREE.Texture>((resolve) => {
          const finish = (t: THREE.Texture) => {
            done++;
            onStep(done / projects.length);
            resolve(t);
          };
          loader.load(
            p.image,
            (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              t.minFilter = THREE.LinearMipmapLinearFilter;
              t.generateMipmaps = true;
              t.anisotropy = 4;
              finish(t);
            },
            undefined,
            () => {
              // Missing image → small dark placeholder so the panel still renders.
              const c = document.createElement("canvas");
              c.width = c.height = 4;
              const ctx = c.getContext("2d")!;
              ctx.fillStyle = "#11131d";
              ctx.fillRect(0, 0, 4, 4);
              finish(new THREE.CanvasTexture(c));
            },
          );
        }),
    ),
  );
}
