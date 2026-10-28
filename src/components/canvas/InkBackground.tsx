"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { frame } from "@/lib/store";

/* ──────────────────────────────────────────────────────────────
 * Background: a slow, domain-warped "ink" field rendered at
 * quarter resolution, distorted by a cheap fluid-like trail that
 * follows the cursor (ping-pong FBO with decay + swirl advection).
 * ────────────────────────────────────────────────────────────── */

const quadVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }
`;

const trailFrag = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uAspect;
uniform float uTime;
uniform float uStrength;
varying vec2 vUv;
void main(){
  vec2 uv=vUv;
  vec4 prev0=texture2D(uPrev,uv);
  // Advect along the stored motion + a gentle swirl, like ink in water.
  vec2 swirl=vec2(sin(uv.y*9.0+uTime*0.7),cos(uv.x*9.0-uTime*0.6))*0.0009;
  vec4 prev=texture2D(uPrev,uv-prev0.gb*0.004-swirl);
  vec2 d=uv-uMouse; d.x*=uAspect;
  float splat=exp(-dot(d,d)/0.0022)*uStrength;
  float v=prev.r*0.972+splat;
  vec2 dir=mix(prev.gb*0.985,uVel,clamp(splat*1.5,0.0,1.0));
  gl_FragColor=vec4(min(v,1.6),dir,1.0);
}
`;

const inkFrag = /* glsl */ `
uniform sampler2D uTrail;
uniform float uTime;
uniform float uAspect;
uniform vec3 uBg;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uHue;
varying vec2 vUv;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
  float v=0.0; float a=0.5;
  for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; }
  return v;
}
void main(){
  vec4 tr=texture2D(uTrail,vUv);
  vec2 p=(vUv-0.5)*vec2(uAspect,1.0);
  p+=tr.gb*0.12*tr.r;
  float t=uTime*0.025;
  vec2 q=vec2(fbm(p*1.4+t),fbm(p*1.4+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p*1.4+3.5*q+vec2(1.7,9.2)+t*1.4),fbm(p*1.4+3.5*q+vec2(8.3,2.8)));
  float f=fbm(p*1.4+3.5*r);
  vec3 tint=mix(uC2,uC1,clamp(q.x*1.4-0.2,0.0,1.0));
  tint=mix(tint,uC3,clamp(r.y-0.45,0.0,1.0)*uHue);
  float ink=smoothstep(0.35,1.0,f)*0.045;
  // Soft glow behind the sculpture + trail highlight.
  float glow=exp(-dot(p,p)*1.8)*0.02;
  vec3 col=uBg+tint*(ink+glow)+mix(uC1,uC3,tr.r*0.6)*tr.r*0.05;
  gl_FragColor=vec4(col,1.0);
}
`;

const bgFrag = /* glsl */ `
uniform sampler2D uInk;
varying vec2 vUv;
float rnd(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec3 c=texture2D(uInk,vUv).rgb;
  // Dither to avoid banding in the dark gradient.
  c+=(rnd(gl_FragCoord.xy)-0.5)/255.0;
  gl_FragColor=vec4(c,1.0);
}
`;

export function InkBackground({ trail }: { trail: boolean }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  const res = useMemo(() => {
    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const a = new THREE.WebGLRenderTarget(256, 256, rtOpts);
    const b = new THREE.WebGLRenderTarget(256, 256, rtOpts);
    const ink = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false, type: THREE.HalfFloatType });
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    const scene = new THREE.Scene();
    scene.add(quad);
    const trailMat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: trailFrag,
      uniforms: {
        uPrev: { value: a.texture },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uVel: { value: new THREE.Vector2() },
        uAspect: { value: 1 },
        uTime: { value: 0 },
        uStrength: { value: 0 },
      },
    });
    const inkMat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: inkFrag,
      uniforms: {
        uTrail: { value: a.texture },
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uBg: { value: new THREE.Color("#05060a") },
        uC1: { value: new THREE.Color("#22e4ff") },
        uC2: { value: new THREE.Color("#7c5cff") },
        uC3: { value: new THREE.Color("#ff5cc8") },
        uHue: { value: 0.5 },
      },
    });
    const bgMat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: bgFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: { uInk: { value: ink.texture } },
    });
    return { a, b, ink, cam, quad, scene, trailMat, inkMat, bgMat, last: new THREE.Vector2(0.5, 0.5) };
  }, []);

  useEffect(() => {
    const w = Math.max(64, Math.round(size.width / 4));
    const h = Math.max(64, Math.round(size.height / 4));
    res.ink.setSize(w, h);
  }, [size, res]);

  useEffect(
    () => () => {
      res.a.dispose();
      res.b.dispose();
      res.ink.dispose();
      res.trailMat.dispose();
      res.inkMat.dispose();
      res.bgMat.dispose();
    },
    [res],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const aspect = size.width / size.height;
    const prevTarget = gl.getRenderTarget();

    if (trail) {
      const mx = frame.pointer.x * 0.5 + 0.5;
      const my = frame.pointer.y * 0.5 + 0.5;
      const vx = (mx - res.last.x) / Math.max(delta, 1e-3);
      const vy = (my - res.last.y) / Math.max(delta, 1e-3);
      res.last.set(mx, my);
      const speed = Math.min(1, Math.hypot(vx, vy) * 0.6);
      const u = res.trailMat.uniforms;
      u.uPrev.value = res.a.texture;
      u.uMouse.value.set(mx, my);
      u.uVel.value.set(THREE.MathUtils.clamp(vx * 0.15, -1, 1), THREE.MathUtils.clamp(vy * 0.15, -1, 1));
      u.uAspect.value = aspect;
      u.uTime.value = t;
      u.uStrength.value = frame.pointer.inside ? speed * 0.35 : 0;
      res.quad.material = res.trailMat;
      gl.setRenderTarget(res.b);
      gl.render(res.scene, res.cam);
      const tmp = res.a;
      res.a = res.b;
      res.b = tmp;
    }

    const iu = res.inkMat.uniforms;
    iu.uTrail.value = res.a.texture;
    iu.uTime.value = t;
    iu.uAspect.value = aspect;
    iu.uHue.value = 0.4 + 0.4 * Math.sin(frame.section * 0.9);
    res.quad.material = res.inkMat;
    gl.setRenderTarget(res.ink);
    gl.render(res.scene, res.cam);
    gl.setRenderTarget(prevTarget);
  });

  return (
    <mesh renderOrder={-100} frustumCulled={false} material={res.bgMat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
