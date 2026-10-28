import type { ShapeName } from "./shapes";

/** Which particle shape each section shows (index matches SECTION_IDS). */
export const SECTION_SHAPES: ShapeName[] = ["organic", "head", "laptop", "organic", "network", "ring"];

type Pose = { x: number; y: number; z: number; scale: number; rotY: number; opacity: number; breath: number };

const desktop: Pose[] = [
  { x: 1.05, y: 0.3, z: 0, scale: 0.86, rotY: 0, opacity: 1, breath: 0.05 }, // hero — sits up-right of the name
  { x: 1.75, y: -0.05, z: 0, scale: 1.05, rotY: 0, opacity: 0.95, breath: 0.012 }, // about — text on the left
  { x: 0, y: 2.0, z: -6.5, scale: 1.6, rotY: 0, opacity: 0.6, breath: 0.01 }, // projects — laptop behind the glass ring
  { x: 2.3, y: 0, z: -1.2, scale: 0.85, rotY: 0, opacity: 0.6, breath: 0.05 }, // open source — timeline on the left
  { x: 0.55, y: -0.1, z: 0, scale: 1.0, rotY: 0, opacity: 0.85, breath: 0.01 }, // skills
  { x: 0, y: 0.1, z: -1.4, scale: 1.25, rotY: 0, opacity: 0.85, breath: 0.015 }, // contact — portal behind the form
];

const mobile: Pose[] = [
  { x: 0, y: 0.45, z: 0, scale: 0.72, rotY: 0, opacity: 1, breath: 0.05 },
  { x: 0, y: 1.25, z: -1.5, scale: 0.75, rotY: 0, opacity: 0.55, breath: 0.012 },
  { x: 0, y: 1.9, z: -6, scale: 1.1, rotY: 0, opacity: 0.45, breath: 0.01 },
  { x: 0, y: 1.5, z: -2.5, scale: 0.7, rotY: 0, opacity: 0.4, breath: 0.05 },
  { x: 0, y: -0.3, z: -0.6, scale: 0.46, rotY: 0, opacity: 0.85, breath: 0.01 },
  { x: 0, y: 0.6, z: -2, scale: 1.0, rotY: 0, opacity: 0.6, breath: 0.015 },
];

const ease = (t: number) => t * t * (3 - 2 * t);

export function poseAt(section: number, isMobile: boolean, out: Pose): Pose {
  const table = isMobile ? mobile : desktop;
  const i = Math.max(0, Math.min(table.length - 1, Math.floor(section)));
  const j = Math.min(table.length - 1, i + 1);
  const t = ease(Math.max(0, Math.min(1, section - i)));
  const a = table[i], b = table[j];
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    out[k] = a[k] + (b[k] - a[k]) * t;
  });
  return out;
}

/** 0..1 weight for how much a given section is "on screen" right now. */
export function sectionWeight(section: number, index: number) {
  return Math.max(0, 1 - Math.abs(section - index));
}

export function makePose(): Pose {
  return { x: 0, y: 0, z: 0, scale: 1, rotY: 0, opacity: 1, breath: 0 };
}
