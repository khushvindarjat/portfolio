"use client";

import { useSyncExternalStore } from "react";

/* ──────────────────────────────────────────────────────────────
 * Two kinds of state:
 *  - `frame`: mutable values read every frame by the WebGL scene
 *    (scroll, pointer, tilt…). Never triggers React renders.
 *  - `ui`:    a tiny reactive store for things React must render
 *    (loading phase, quality, open project, hovered skill…).
 * ────────────────────────────────────────────────────────────── */

export type Tier = "low" | "medium" | "high";

export type Quality = {
  tier: Tier;
  /** GPGPU texture size → particles = size² */
  size: number;
  dpr: [number, number];
  post: "full" | "lite" | "none";
  glass: boolean;
  ink: boolean;
  mobile: boolean;
};

export const SECTION_IDS = ["hero", "about", "projects", "opensource", "skills", "contact"] as const;

export const frame = {
  /** Continuous section index, e.g. 1.4 = 40% of the way from About to Projects. */
  section: 0,
  /** Continuous carousel index inside the Projects section. */
  carousel: 0,
  pointer: { x: 0, y: 0, down: false, inside: false, speed: 0 },
  tilt: { x: 0, y: 0 },
  hoverPanel: -1,
  /** Set by the scene so DOM overlays can align with 3D nodes. */
  skillScreen: [] as { x: number; y: number; visible: boolean }[],
  fps: 0,
};

type UIState = {
  phase: "loading" | "intro" | "ready";
  progress: number;
  quality: Quality | null;
  webgl: boolean;
  reduced: boolean;
  skipIntro: boolean;
  detail: string | null;
  hoverSkill: string | null;
  sound: boolean;
  cursor: string | null;
  activeSection: number;
  activeProject: number;
};

let ui: UIState = {
  phase: "loading",
  progress: 0,
  quality: null,
  webgl: true,
  reduced: false,
  skipIntro: false,
  detail: null,
  hoverSkill: null,
  sound: false,
  cursor: null,
  activeSection: 0,
  activeProject: 0,
};

const listeners = new Set<() => void>();

export function setUI(patch: Partial<UIState>) {
  let changed = false;
  for (const k in patch) {
    const key = k as keyof UIState;
    if (ui[key] !== patch[key]) changed = true;
  }
  if (!changed) return;
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}

export function getUI() {
  return ui;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useUI<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(ui),
    () => selector(ui),
  );
}

/** Small event bus for one-shot scene events (intro start, skip, explode…). */
type SceneEvent = "intro" | "skip" | "flash";
const sceneListeners = new Set<(e: SceneEvent) => void>();
export function emitScene(e: SceneEvent) {
  sceneListeners.forEach((l) => l(e));
}
export function onScene(l: (e: SceneEvent) => void) {
  sceneListeners.add(l);
  return () => {
    sceneListeners.delete(l);
  };
}
