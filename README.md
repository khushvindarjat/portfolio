# Khushvindar Singh Choudhary — Portfolio

A 3D portfolio built around one living object: a sculpture of up to ~100,000 GPU-simulated particles. It plays the intro, follows the cursor like a force field, and morphs into a new shape for every section.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · React Three Fiber + Drei · @react-three/postprocessing · custom GLSL (GPGPU via `GPUComputationRenderer`) · GSAP + ScrollTrigger · Lenis · Framer Motion · detect-gpu

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (static)
npm start          # serve the build
```

Handy URL flags for testing:

| Flag | Effect |
| --- | --- |
| `?quality=low` / `medium` / `high` | Force a quality tier instead of detecting the GPU |
| `?reduced` | Preview the reduced-motion version |
| `?nowebgl` | Preview the no-WebGL fallback layout |
| `?intro` | Replay the full intro (it's shortened on repeat visits) |

---

## Editing content (no component changes needed)

**Everything lives in [`src/content/data.ts`](src/content/data.ts):** name, tagline, bio, stats, projects, open-source timeline, skills, contact text and links.

- **Placeholders:** anything still to fill in is wrapped in `[[ … ]]`. Search the repo for `[[` to find them all.
- **Projects:** add an object to the `projects` array. Put the image in `public/projects/` and point `image` at it. A 16:10 image works best, e.g. 1280×800 WebP.
- **Skills:** add to `skills`. `icon` is a [Simple Icons](https://simpleicons.org) slug. After adding a new slug, regenerate `src/content/icons.ts` (see below). `projects` lists the project `id`s that used the skill; skills that share a project get connected in the 3D network automatically.
- **Open source:** add entries to `openSource.timeline` (newest first).

### Refreshing project screenshots

```bash
npm run dev                        # in one terminal
node scripts/shoot-projects.mjs    # screenshots every live demo → public/projects/*.png
node scripts/optimize-images.mjs   # → resized .webp, deletes the .png
```

### Regenerating the OG image

```bash
npm run build && npx next start -p 3001
node scripts/og.mjs http://localhost:3001/   # writes public/og.png
```

### Adding a skill icon

```bash
node -e "const si=require('simple-icons');console.log(JSON.stringify(si.siDocker))"
```
Copy `title` and `path` into `src/content/icons.ts` under the slug.

---

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. On vercel.com: **Add New → Project → Import** the repo. The defaults are correct (framework: Next.js, no environment variables).
3. After the first deploy, set `site.url` in `data.ts` to the real domain, so Open Graph links are absolute, and redeploy.

The page is fully static (`○ /` in the build output), so it's served from the CDN edge.

---

## How it works

```
src/
  content/data.ts          ← all text, links, projects, skills
  components/Experience.tsx  boot sequence: capability check → quality tier → lazy-load 3D → loader → intro
  components/canvas/        everything WebGL (loaded lazily, never blocks first paint)
    Particles.tsx           GPGPU simulation + points, intro timeline, morph scheduling, mouse/hold forces
    shaders/particles.ts    curl noise (analytic simplex gradients), velocity/position/render shaders
    InkBackground.tsx       quarter-res domain-warped "ink" + cursor fluid trail (ping-pong FBO)
    ProjectRing.tsx         glass panels (MeshTransmissionMaterial, one shared buffer) + RGB-shift image shader
    SkillGraph.tsx          network edges + screen projection for DOM skill labels
    CameraRig.tsx           scroll/parallax camera, fly-in to an opened project
    Effects.tsx             bloom · chromatic aberration · film grain · vignette
  components/dom/           sections, loader, custom cursor, nav, project detail
  lib/shapes.ts             procedural target shapes sampled with MeshSurfaceSampler
  lib/layout.ts             per-section pose of the sculpture (desktop + mobile)
  lib/scroll.ts             Lenis + ScrollTrigger → continuous section index
  lib/quality.ts            detect-gpu tiers (benchmarks self-hosted in public/gpu-benchmarks)
  lib/sound.ts              synthesized ambient hum + UI clicks (Web Audio, no files)
```

- **Particles:** positions and velocities live in float textures. Each frame a shader applies a spring toward the current target shape, curl-noise flow, a cursor force field (push + swirl around the mouse ray), and black-hole attraction while the pointer is held. Releasing triggers an outward impulse.
- **Morphs:** each section has a target shape (organic form → head/bust → laptop → organic → neural network → portal ring). Changing section tweens between two target textures with a staggered per-particle start and a short scatter burst in the middle.
- **Shapes are procedural:** meshes are built in code and sampled, so there are no model downloads. That's why Draco/KTX2 isn't needed; screenshots ship as small WebP files (~20–40 KB each).

### Performance & accessibility

| Tier | Particles | Post-FX | Glass |
| --- | --- | --- | --- |
| Desktop high | 102k | full | transmission |
| Desktop medium | 50k | full | transmission |
| Desktop low | 25k | bloom + vignette | plain |
| Mobile | 20–25k | bloom + vignette (none on low) | high tier only |

- `PerformanceMonitor` lowers the pixel ratio when frames drop, then drops post-processing.
- `prefers-reduced-motion`: no intro burst, no curl turbulence, no scatter, native scrolling.
- If WebGL2 or float render targets are missing (or the context is lost), the site switches to a static layout with every piece of content still available.
- Measured on the production build (Apple M5, Chromium): 60 fps average / 58 minimum on desktop at 102k particles. With iPhone 14 Pro emulation at 4× CPU throttle: 60 fps average / 55 minimum.

### Dev helper scripts

`scripts/inspect.mjs` (screenshots + console errors per section), `scripts/interact.mjs` (force field, hold, fly-in, skills hover), `scripts/perf.mjs` (load weight + FPS while scrolling; `--mobile` adds 4× CPU throttle) and `scripts/sheet.mjs` (contact sheets). Each needs a running server and a Playwright Chromium (`npx playwright install chromium`).
