"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { frame, getUI } from "@/lib/store";
import { focus } from "./focus";

/** Scroll/pointer-driven camera with a fly-in mode for the project detail view. */
export function CameraRig({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const v = useMemo(() => ({ pos: new THREE.Vector3(0, 0, 6.5), look: new THREE.Vector3(), curLook: new THREE.Vector3() }), []);

  useFrame((state, delta) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 1 / 20);
    const ui = getUI();
    const px = mobile ? frame.tilt.x : frame.pointer.x;
    const py = mobile ? frame.tilt.y : frame.pointer.y;
    const par = reduced ? 0.05 : 1;

    if (ui.detail && focus.active) {
      // Fly in close to the selected glass panel; leave room for the text panel.
      const side = mobile ? 0 : 0.95 * focus.scale;
      const down = mobile ? -1.05 * focus.scale : 0;
      v.pos.set(focus.pos.x + side + px * 0.05, focus.pos.y + down + py * 0.04, focus.pos.z + (mobile ? 5.6 : 4.6) * focus.scale);
      v.look.set(focus.pos.x + side, focus.pos.y + down, focus.pos.z);
    } else {
      // Slight dolly between sections + parallax.
      const sway = Math.sin(frame.section * Math.PI) * 0.25;
      v.pos.set(px * 0.32 * par, py * 0.2 * par + sway * 0.3, (mobile ? 7.6 : 6.5) - sway * 0.4);
      v.look.set(px * 0.08 * par, py * 0.05 * par, 0);
    }
    const k = 1 - Math.exp(-dt * (ui.detail ? 3.2 : 3.6));
    cam.position.lerp(v.pos, k);
    v.curLook.lerp(v.look, k);
    cam.lookAt(v.curLook);
  });

  return null;
}
