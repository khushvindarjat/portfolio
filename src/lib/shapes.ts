import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { skills } from "@/content/data";

/* ──────────────────────────────────────────────────────────────
 * Target point clouds for the particle sculpture.
 * Every shape returns a Float32Array of count*4 (xyz + seed) that
 * becomes a float DataTexture read by the GPGPU simulation.
 * Meshes are built procedurally (no downloads) and sampled with
 * MeshSurfaceSampler.
 * ────────────────────────────────────────────────────────────── */

export const SHAPES = ["organic", "head", "laptop", "network", "ring"] as const;
export type ShapeName = (typeof SHAPES)[number];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number) {
  const u = Math.max(1e-6, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Cheap smooth pseudo-noise (sum of sines) — good enough for displacement. */
function snoise(x: number, y: number, z: number) {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 2.3 + z * 0.7)) * 0.5 +
    Math.sin(y * 2.1 + Math.sin(z * 1.9 + x * 1.1)) * 0.3 +
    Math.sin(z * 2.7 + Math.sin(x * 2.9 - y * 1.3)) * 0.2
  );
}

class Writer {
  i = 0;
  constructor(public out: Float32Array, public count: number, public rand: () => number) {}
  push(x: number, y: number, z: number) {
    if (this.i >= this.count) return false;
    const o = this.i * 4;
    this.out[o] = x;
    this.out[o + 1] = y;
    this.out[o + 2] = z;
    this.out[o + 3] = this.rand();
    this.i++;
    return true;
  }
  quota(fraction: number) {
    return Math.min(this.count - this.i, Math.floor(this.count * fraction));
  }
  get remaining() {
    return this.count - this.i;
  }
}

function sampleMesh(geo: THREE.BufferGeometry, n: number, w: Writer, transform?: (p: THREE.Vector3, nrm: THREE.Vector3) => void) {
  const mesh = new THREE.Mesh(geo);
  const sampler = new MeshSurfaceSampler(mesh);
  // Seeded RNG so shapes are identical on every visit (typings lag behind three's API).
  (sampler as unknown as { randomFunction: () => number }).randomFunction = w.rand;
  sampler.build();
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    sampler.sample(p, nrm);
    transform?.(p, nrm);
    w.push(p.x, p.y, p.z);
  }
}

/* ── 1. Hero: liquid sphere / torus-knot hybrid ───────────────── */
function organic(w: Writer) {
  const knot = new THREE.TorusKnotGeometry(0.82, 0.3, 360, 48, 2, 3);
  sampleMesh(knot, w.quota(0.72), w, (p, n) => {
    const d = snoise(p.x * 2.2, p.y * 2.2, p.z * 2.2) * 0.07;
    p.addScaledVector(n, d + gauss(w.rand) * 0.012);
  });
  // Liquid shell: a sphere with flowing latitude bands.
  const shell = w.quota(0.18);
  for (let k = 0; k < shell; k++) {
    const u = w.rand() * 2 - 1;
    const th = w.rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const x = s * Math.cos(th), y = u, z = s * Math.sin(th);
    const band = Math.sin(y * 9 + snoise(x * 2, y * 2, z * 2) * 2.2);
    if (Math.abs(band) > 0.55 && w.rand() > 0.15) {
      k--;
      continue;
    }
    const r = 1.32 + snoise(x * 1.6, y * 1.6, z * 1.6) * 0.07 + gauss(w.rand) * 0.008;
    w.push(x * r, y * r, z * r);
  }
  // Glowing core
  while (w.remaining > 0) {
    const r = Math.pow(w.rand(), 2.2) * 0.55;
    const u = w.rand() * 2 - 1;
    const th = w.rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    w.push(s * Math.cos(th) * r, u * r, s * Math.sin(th) * r);
  }
}

/* ── 2. About: a generic stylised head + bust ─────────────────── */
function headGeometry() {
  const head = new THREE.SphereGeometry(1, 128, 128);
  const pos = head.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const g = (x: number, s: number) => Math.exp(-(x * x) / s);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let { x, y, z } = v;
    // Skull proportions
    x *= 0.74;
    z *= 0.86;
    y *= 1.02;
    // Back of the head rounder & larger
    if (z < 0) z *= 1.08;
    // Jaw narrows towards the chin
    const jaw = THREE.MathUtils.smoothstep(-y, 0.15, 0.95);
    x *= 1 - jaw * 0.38;
    z *= 1 - jaw * 0.22 * (z < 0 ? 1.6 : 1);
    if (z > 0) {
      const ax = Math.abs(x);
      // Forehead flattening
      z -= THREE.MathUtils.smoothstep(y, 0.2, 0.8) * 0.06;
      // Brow ridge
      z += g(y - 0.24, 0.004) * g(x, 0.12) * 0.07;
      // Eye sockets
      z -= g(ax - 0.27, 0.01) * g(y - 0.12, 0.006) * 0.12;
      // Nose
      z += g(x, 0.006) * THREE.MathUtils.smoothstep(-y, -0.18, 0.12) * THREE.MathUtils.smoothstep(y, -0.36, -0.08) * 0.32;
      // Nostrils / nose tip
      z += g(x, 0.012) * g(y + 0.3, 0.004) * 0.1;
      // Cheekbones
      z += g(ax - 0.42, 0.02) * g(y + 0.05, 0.02) * 0.05;
      // Lips
      z += g(x, 0.03) * g(y + 0.5, 0.004) * 0.07;
      z -= g(x, 0.03) * g(y + 0.56, 0.0008) * 0.03;
      // Chin
      z += g(x, 0.02) * g(y + 0.78, 0.01) * 0.08;
    }
    // Ears
    x += Math.sign(x) * g(z + 0.08, 0.02) * g(y - 0.02, 0.03) * 0.13;
    pos.setXYZ(i, x, y, z);
  }
  head.computeVertexNormals();

  const neck = new THREE.CylinderGeometry(0.3, 0.36, 0.8, 64, 8, true);
  neck.translate(0, -1.08, -0.12);

  const shoulders = new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI * 0.5);
  shoulders.scale(1.55, 0.48, 0.62);
  shoulders.translate(0, -1.5, -0.12);

  return { head, neck, shoulders };
}

function head(w: Writer) {
  const { head, neck, shoulders } = headGeometry();
  const rot = new THREE.Matrix4().makeRotationY(-0.55);
  const place = (p: THREE.Vector3) => {
    p.y += 0.42;
    p.applyMatrix4(rot);
    p.multiplyScalar(1.02);
  };
  sampleMesh(head, w.quota(0.68), w, (p, n) => {
    p.addScaledVector(n, gauss(w.rand) * 0.006);
    place(p);
  });
  sampleMesh(neck, w.quota(0.1), w, place);
  sampleMesh(shoulders, w.quota(0.17), w, (p) => {
    place(p);
  });
  // Faint aura around the silhouette
  while (w.remaining > 0) {
    const u = w.rand() * 2 - 1;
    const th = w.rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 1.7 + w.rand() * 0.6;
    w.push(s * Math.cos(th) * r * 0.8, u * r * 0.9 + 0.1, s * Math.sin(th) * r * 0.5);
  }
}

/* ── 3. Projects: a floating laptop ───────────────────────────── */
function laptop(w: Writer) {
  const W = 2.5, D = 1.65, T = 0.07;
  const tilt = -0.32; // screen leans back
  const baseY = -0.62;
  const hinge = new THREE.Vector3(0, baseY + T / 2, -D / 2);
  const screenRot = new THREE.Matrix4().makeRotationX(tilt);
  const toScreen = (x: number, y: number, z: number) => {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(screenRot).add(hinge);
    w.push(p.x, p.y, p.z);
  };
  const H = 1.6;

  // Screen: code lines drawn with particles
  const lines = w.quota(0.32);
  const rows = 15;
  const lineLen: number[] = [];
  const indent: number[] = [];
  for (let r = 0; r < rows; r++) {
    indent.push([0, 0.12, 0.24, 0.12, 0.24, 0.36][Math.floor(w.rand() * 6)]);
    lineLen.push(0.25 + w.rand() * 1.3);
  }
  for (let k = 0; k < lines; k++) {
    const r = Math.floor(w.rand() * rows);
    const x0 = -W / 2 + 0.22 + indent[r];
    const x = x0 + w.rand() * lineLen[r];
    if (x > W / 2 - 0.2) {
      k--;
      continue;
    }
    const y = H - 0.22 - r * ((H - 0.4) / rows) + gauss(w.rand) * 0.008;
    toScreen(x, y, 0.035 + gauss(w.rand) * 0.004);
  }
  // Screen frame (bezel outline) — dense edges
  const frame = w.quota(0.16);
  for (let k = 0; k < frame; k++) {
    const t = w.rand();
    const side = Math.floor(w.rand() * 4);
    const inset = w.rand() < 0.5 ? 0 : 0.08;
    let x = 0, y = 0;
    if (side === 0) { x = -W / 2 + inset; y = t * H; }
    else if (side === 1) { x = W / 2 - inset; y = t * H; }
    else if (side === 2) { x = (t - 0.5) * W; y = inset; }
    else { x = (t - 0.5) * W; y = H - inset; }
    toScreen(x + gauss(w.rand) * 0.004, y + gauss(w.rand) * 0.004, 0.03);
  }
  // Screen back panel (sparse)
  const back = w.quota(0.12);
  for (let k = 0; k < back; k++) toScreen((w.rand() - 0.5) * W, w.rand() * H, -0.01);

  // Base: surface + edges
  const base = w.quota(0.16);
  for (let k = 0; k < base; k++) {
    const edge = w.rand() < 0.35;
    let x = (w.rand() - 0.5) * W, z = (w.rand() - 0.5) * D;
    if (edge) {
      if (w.rand() < 0.5) x = Math.sign(x) * W / 2;
      else z = Math.sign(z) * D / 2;
    }
    const y = baseY + (w.rand() < 0.75 ? T / 2 : -T / 2);
    w.push(x, y, z);
  }
  // Keyboard: grid of keys
  const keys = w.quota(0.16);
  const cols = 14, krows = 5;
  for (let k = 0; k < keys; k++) {
    const c = Math.floor(w.rand() * cols);
    const r = Math.floor(w.rand() * krows);
    const kx = -W / 2 + 0.25 + (c + 0.5) * ((W - 0.5) / cols);
    const kz = -D / 2 + 0.18 + (r + 0.5) * 0.15;
    const ox = (w.rand() - 0.5) * 0.1, oz = (w.rand() - 0.5) * 0.1;
    w.push(kx + ox, baseY + T / 2 + 0.012, kz + oz);
  }
  // Trackpad outline
  while (w.remaining > 0) {
    const t = w.rand();
    const side = Math.floor(w.rand() * 4);
    const tw = 0.8, td = 0.45, cz = D / 2 - 0.36;
    let x = 0, z = 0;
    if (side === 0) { x = -tw / 2; z = cz + (t - 0.5) * td; }
    else if (side === 1) { x = tw / 2; z = cz + (t - 0.5) * td; }
    else if (side === 2) { x = (t - 0.5) * tw; z = cz - td / 2; }
    else { x = (t - 0.5) * tw; z = cz + td / 2; }
    w.push(x, baseY + T / 2 + 0.01, z);
  }
}

/* ── 4. Skills: a neural-network-like graph ───────────────────── */
export type NetworkLayout = {
  nodes: { pos: THREE.Vector3; skill: number }[];
  edges: [number, number][];
};

let layoutCache: NetworkLayout | null = null;
export function networkLayout(): NetworkLayout {
  if (layoutCache) return layoutCache;
  const rand = mulberry32(7);
  const nodes: NetworkLayout["nodes"] = [];
  const n = skills.length;
  // Skill nodes on a squashed Fibonacci sphere so they spread nicely on screen.
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.39996 + 0.6;
    nodes.push({
      pos: new THREE.Vector3(Math.cos(th) * r * 2.05, y * 1.25, Math.sin(th) * r * 0.9),
      skill: i,
    });
  }
  // Minor "neuron" nodes
  for (let i = 0; i < 26; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 0.6 + rand() * 1.5;
    nodes.push({ pos: new THREE.Vector3(Math.cos(th) * s * r * 1.3, u * r * 0.8, Math.sin(th) * s * r * 0.8), skill: -1 });
  }
  const edges: [number, number][] = [];
  const has = new Set<string>();
  const add = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || has.has(key)) return;
    has.add(key);
    edges.push([a, b]);
  };
  // Skills that were used together in a project are connected.
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const pa = skills[a].projects as readonly string[];
      const pb = skills[b].projects as readonly string[];
      if (pa.some((p) => pb.includes(p))) add(a, b);
    }
  // Every node links to its nearest neighbours.
  for (let i = n; i < nodes.length; i++) {
    const near = nodes
      .map((m, j) => ({ j, d: m.pos.distanceTo(nodes[i].pos) }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3);
    near.forEach((o) => add(i, o.j));
  }
  layoutCache = { nodes, edges };
  return layoutCache;
}

function network(w: Writer) {
  const { nodes, edges } = networkLayout();
  const skillNodes = nodes.filter((nd) => nd.skill >= 0);
  const minor = nodes.filter((nd) => nd.skill < 0);
  const big = w.quota(0.26);
  for (let k = 0; k < big; k++) {
    const nd = skillNodes[k % skillNodes.length];
    const r = 0.11;
    w.push(nd.pos.x + gauss(w.rand) * r * 0.5, nd.pos.y + gauss(w.rand) * r * 0.5, nd.pos.z + gauss(w.rand) * r * 0.5);
  }
  const small = w.quota(0.1);
  for (let k = 0; k < small; k++) {
    const nd = minor[k % minor.length];
    w.push(nd.pos.x + gauss(w.rand) * 0.025, nd.pos.y + gauss(w.rand) * 0.025, nd.pos.z + gauss(w.rand) * 0.025);
  }
  const lens = edges.map(([a, b]) => nodes[a].pos.distanceTo(nodes[b].pos));
  const total = lens.reduce((s, l) => s + l, 0);
  const along = w.quota(0.56);
  let made = 0;
  edges.forEach(([a, b], e) => {
    const cnt = e === edges.length - 1 ? along - made : Math.round((lens[e] / total) * along);
    for (let k = 0; k < cnt; k++) {
      const t = w.rand();
      const pa = nodes[a].pos, pb = nodes[b].pos;
      const j = 0.008;
      w.push(
        pa.x + (pb.x - pa.x) * t + gauss(w.rand) * j,
        pa.y + (pb.y - pa.y) * t + gauss(w.rand) * j,
        pa.z + (pb.z - pa.z) * t + gauss(w.rand) * j,
      );
    }
    made += cnt;
  });
  while (w.remaining > 0) {
    const u = w.rand() * 2 - 1;
    const th = w.rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 1.2 + w.rand() * 1.8;
    w.push(Math.cos(th) * s * r * 1.4, u * r * 0.8, Math.sin(th) * s * r * 0.7);
  }
}

/* ── 5. Contact: a slowly rotating ring / portal ─────────────── */
function ring(w: Writer) {
  const R = 1.55;
  const main = w.quota(0.42);
  for (let k = 0; k < main; k++) {
    const a = w.rand() * Math.PI * 2;
    const tube = Math.abs(gauss(w.rand)) * 0.045;
    const ta = w.rand() * Math.PI * 2;
    const r = R + Math.cos(ta) * tube;
    w.push(Math.cos(a) * r, Math.sin(a) * r, Math.sin(ta) * tube);
  }
  const thin = w.quota(0.1);
  for (let k = 0; k < thin; k++) {
    const a = w.rand() * Math.PI * 2;
    const r = 1.82 + gauss(w.rand) * 0.006;
    w.push(Math.cos(a) * r, Math.sin(a) * r, gauss(w.rand) * 0.01);
  }
  // Inner spiral disc — the "portal"
  const disc = w.quota(0.38);
  const arms = 5;
  for (let k = 0; k < disc; k++) {
    const t = Math.sqrt(w.rand());
    const r = t * 1.42;
    const arm = Math.floor(w.rand() * arms);
    const a = (arm / arms) * Math.PI * 2 + r * 2.6 + gauss(w.rand) * 0.12;
    w.push(Math.cos(a) * r, Math.sin(a) * r, gauss(w.rand) * 0.04 - (1 - t) * 0.5);
  }
  while (w.remaining > 0) {
    const a = w.rand() * Math.PI * 2;
    const r = 1.9 + Math.abs(gauss(w.rand)) * 0.5;
    w.push(Math.cos(a) * r, Math.sin(a) * r, gauss(w.rand) * 0.15);
  }
}

const builders: Record<ShapeName, (w: Writer) => void> = { organic, head, laptop, network, ring };

/** Shuffle so that each particle index maps to a random spot in each shape (nicer morphs). */
function shuffle(arr: Float32Array, rand: () => number) {
  const n = arr.length / 4;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    for (let c = 0; c < 4; c++) {
      const t = arr[i * 4 + c];
      arr[i * 4 + c] = arr[j * 4 + c];
      arr[j * 4 + c] = t;
    }
  }
}

export function buildShape(name: ShapeName, count: number): Float32Array {
  const rand = mulberry32(SHAPES.indexOf(name) * 977 + 13);
  const out = new Float32Array(count * 4);
  const w = new Writer(out, count, rand);
  builders[name](w);
  while (w.remaining > 0) w.push(0, 0, 0);
  shuffle(out, rand);
  return out;
}

