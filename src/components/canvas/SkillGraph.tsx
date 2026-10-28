"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { networkLayout } from "@/lib/shapes";
import { frame, getUI } from "@/lib/store";
import { sectionWeight } from "@/lib/layout";
import { skills } from "@/content/data";

/**
 * Glowing edges for the skills network. Lives inside the particle group so it
 * shares its transform; also projects every skill node to screen space so the
 * DOM labels can follow the 3D nodes.
 */
export function SkillGraph() {
  const lines = useRef<THREE.LineSegments>(null);
  const layout = useMemo(() => networkLayout(), []);
  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(layout.edges.length * 6);
    layout.edges.forEach(([a, b], i) => {
      layout.nodes[a].pos.toArray(pos, i * 6);
      layout.nodes[b].pos.toArray(pos, i * 6 + 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(layout.edges.length * 6), 3));
    const m = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    });
    return { geometry: g, material: m };
  }, [layout]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const state = useRef({ hover: "__init__" as string | null, glow: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const dim = useMemo(() => new THREE.Color("#3b3f8f"), []);
  const hot = useMemo(() => new THREE.Color("#7ff3ff"), []);
  const mid = useMemo(() => new THREE.Color("#8b6cff"), []);

  useFrame((s, delta) => {
    const l = lines.current;
    if (!l) return;
    const w = sectionWeight(frame.section, 4);
    const ui = getUI();
    const target = Math.pow(w, 3) * 0.9;
    material.opacity += (target - material.opacity) * (1 - Math.exp(-delta * 4));
    l.visible = material.opacity > 0.01;

    // Recolour edges when the hovered skill changes.
    if (ui.hoverSkill !== state.current.hover) {
      state.current.hover = ui.hoverSkill;
      const hi = ui.hoverSkill ? skills.findIndex((sk) => sk.id === ui.hoverSkill) : -1;
      const col = geometry.attributes.color as THREE.BufferAttribute;
      layout.edges.forEach(([a, b], i) => {
        const on = hi >= 0 && (a === hi || b === hi);
        const c = hi < 0 ? (a < skills.length && b < skills.length ? mid : dim) : on ? hot : dim;
        const k = hi >= 0 && !on ? 0.35 : 1;
        col.setXYZ(i * 2, c.r * k, c.g * k, c.b * k);
        col.setXYZ(i * 2 + 1, c.r * k, c.g * k, c.b * k);
      });
      col.needsUpdate = true;
    }

    // Project skill nodes to screen for the DOM labels.
    const out = frame.skillScreen;
    const cam = s.camera;
    for (let i = 0; i < skills.length; i++) {
      tmp.copy(layout.nodes[i].pos);
      l.localToWorld(tmp);
      tmp.project(cam);
      out[i] = { x: (tmp.x * 0.5 + 0.5) * s.size.width, y: (-tmp.y * 0.5 + 0.5) * s.size.height, visible: tmp.z < 1 };
    }
  });

  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />;
}
