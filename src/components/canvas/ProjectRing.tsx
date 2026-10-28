"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { MeshTransmissionMaterial, RoundedBox, useFBO } from "@react-three/drei";
import * as THREE from "three";
import { projects } from "@/content/data";
import { frame, getUI, setUI, type Quality } from "@/lib/store";
import { sectionWeight } from "@/lib/layout";
import { focus } from "./focus";
import { sfx } from "@/lib/sound";

const PANEL_W = 2.4;
const PANEL_H = 1.5;
const RADIUS = 5.2;
const STEP = 0.46; // radians between panels on the ring

const imageVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;

const imageFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uHover;
uniform vec2 uMouse;
uniform float uBlur;
uniform float uOpacity;
uniform float uTime;
uniform float uActive;
uniform float uAspect;
varying vec2 vUv;
void main(){
  vec2 uv=vUv;
  vec2 d=uv-uMouse; d.x*=uAspect;
  float dist=length(d);
  // Liquid ripple from the cursor + slow wobble.
  float wave=sin(dist*30.0-uTime*5.0)*exp(-dist*4.5)*0.014*uHover;
  uv+=normalize(d+1e-4)*wave;
  uv+=vec2(sin(uv.y*11.0+uTime*1.4),cos(uv.x*9.0+uTime*1.1))*0.0035*uHover;
  // RGB shift.
  float shift=0.007*uHover+0.003*uBlur;
  vec2 dir=normalize(d+vec2(1e-4))*shift;
  float bias=uBlur*4.0;
  float r=texture2D(uMap,uv+dir,bias).r;
  float g=texture2D(uMap,uv,bias).g;
  float b=texture2D(uMap,uv-dir,bias).b;
  vec3 col=vec3(r,g,b);
  // Keep bright screenshots from blooming too much.
  col*=0.42+0.22*uActive+0.06*uHover;
  // Rounded-corner mask.
  vec2 q=abs(vUv-0.5)*vec2(uAspect,1.0)-vec2(uAspect*0.5-0.035,0.5-0.035);
  float corner=length(max(q,0.0))-0.035;
  float mask=1.0-smoothstep(-0.002,0.002,corner);
  // Subtle top sheen.
  col+=vec3(0.6,0.8,1.0)*smoothstep(0.75,1.0,vUv.y)*0.04*uActive;
  gl_FragColor=vec4(col,uOpacity*mask);
}
`;

type PanelProps = {
  index: number;
  texture: THREE.Texture;
  quality: Quality;
  buffer: THREE.Texture | null;
};

function Panel({ index, texture, quality, buffer }: PanelProps) {
  const group = useRef<THREE.Group>(null);
  const hover = useRef({ v: 0, target: 0 });
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: imageVert,
        fragmentShader: imageFrag,
        transparent: true,
        uniforms: {
          uMap: { value: texture },
          uHover: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uBlur: { value: 0 },
          uOpacity: { value: 1 },
          uTime: { value: 0 },
          uActive: { value: 0 },
          uAspect: { value: PANEL_W / PANEL_H },
        },
      }),
    [texture],
  );
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const d = index - frame.carousel;
    const a = d * STEP;
    const ad = Math.abs(d);
    g.position.set(Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS - RADIUS + Math.max(0, 1 - ad) * 0.45);
    g.rotation.y = a * 0.85;
    g.visible = ad < 3.2;
    const h = hover.current;
    h.v += (h.target - h.v) * (1 - Math.exp(-delta * 8));
    const u = mat.uniforms;
    u.uHover.value = h.v;
    u.uTime.value = state.clock.elapsedTime;
    u.uBlur.value = Math.min(1, ad * 0.9);
    u.uActive.value = Math.max(0, 1 - ad);
    u.uOpacity.value = THREE.MathUtils.clamp(1.25 - ad * 0.38, 0, 1);
  });

  const isActive = () => Math.abs(index - frame.carousel) < 0.5;
  /** Ignore events while another section is on screen or when the pointer is over real UI. */
  const blocked = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    Math.abs(frame.section - 2) > 0.35 ||
    !!getUI().detail ||
    !!(e.nativeEvent.target as HTMLElement | null)?.closest?.("a,button,input,textarea,[role=dialog]");

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.uv) mat.uniforms.uMouse.value.copy(e.uv);
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (blocked(e)) return;
    sfx.hover();
    hover.current.target = 1;
    frame.hoverPanel = index;
    setUI({ cursor: isActive() ? "open" : "view" });
  };
  const onOut = () => {
    hover.current.target = 0;
    if (frame.hoverPanel === index) {
      frame.hoverPanel = -1;
      setUI({ cursor: null });
    }
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (blocked(e) || dragGuard.moved) return;
    sfx.click();
    if (isActive()) {
      setUI({ detail: projects[index].id, cursor: null });
    } else {
      window.dispatchEvent(new CustomEvent("carousel:goto", { detail: index }));
    }
  };

  const glassMat = quality.glass && buffer ? (
    <MeshTransmissionMaterial
      buffer={buffer}
      resolution={32}
      samples={quality.tier === "high" ? 6 : 4}
      transmission={1}
      thickness={0.35}
      roughness={0.08}
      ior={1.35}
      chromaticAberration={0.08}
      anisotropicBlur={0.2}
      distortion={0.25}
      distortionScale={0.4}
      temporalDistortion={0.08}
      color="#cfe8ff"
      attenuationColor="#9fb6ff"
      attenuationDistance={2.5}
    />
  ) : (
    <meshPhysicalMaterial color="#1a2140" roughness={0.25} metalness={0.1} transparent opacity={0.55} />
  );

  return (
    <group ref={group}>
      <RoundedBox args={[PANEL_W + 0.18, PANEL_H + 0.18, 0.1]} radius={0.06} smoothness={4}>
        {glassMat}
      </RoundedBox>
      <mesh
        position={[0, 0, 0.052]}
        material={mat}
        onPointerMove={onMove}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <planeGeometry args={[PANEL_W, PANEL_H]} />
      </mesh>
    </group>
  );
}

/** Shared between the ring and the DOM drag handler so a drag never counts as a click. */
export const dragGuard = { moved: false };

export function ProjectRing({ quality, textures }: { quality: Quality; textures: THREE.Texture[] }) {
  const root = useRef<THREE.Group>(null);
  const panels = useRef<THREE.Group>(null);
  const { gl, scene, camera, size } = useThree();
  const fbo = useFBO(Math.round(size.width * 0.5), Math.round(size.height * 0.5), { type: THREE.HalfFloatType });
  const useGlass = quality.glass;

  useFrame(() => {
    const r = root.current;
    if (!r) return;
    const w = sectionWeight(frame.section, 2);
    const visible = w > 0.02;
    r.visible = visible;
    if (!visible) {
      focus.active = false;
      return;
    }
    // Rise into place as the section arrives.
    const mobileScale = quality.mobile ? Math.min(1, (size.width / size.height) * 1.25) : 1;
    const s = (0.85 + 0.15 * w) * mobileScale;
    r.scale.setScalar(s);
    r.position.set(0, (1 - w) * -2.2 + (quality.mobile ? 0.15 : -0.05), (1 - w) * -1.5);

    // Remember where the active panel is so the camera can fly to it.
    const ui = getUI();
    if (ui.detail) {
      const idx = projects.findIndex((p) => p.id === ui.detail);
      const child = panels.current?.children[idx];
      if (child) {
        child.getWorldPosition(focus.pos);
        focus.scale = s;
        focus.active = true;
      }
    } else focus.active = false;

    // Render the scene (minus the glass) into a shared buffer for transmission.
    if (useGlass) {
      r.visible = false;
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(fbo);
      gl.clear();
      gl.render(scene, camera);
      gl.setRenderTarget(prev);
      r.visible = true;
    }
  });

  return (
    <group ref={root} visible={false}>
      <group ref={panels}>
        {projects.map((p, i) => (
          <Panel key={p.id} index={i} texture={textures[i]} quality={quality} buffer={useGlass ? fbo.texture : null} />
        ))}
      </group>
    </group>
  );
}
