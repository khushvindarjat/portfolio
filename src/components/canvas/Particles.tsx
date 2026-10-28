"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import gsap from "gsap";
import { frame, getUI, onScene, setUI, type Quality } from "@/lib/store";
import { SHAPES } from "@/lib/shapes";
import { SECTION_SHAPES, makePose, poseAt } from "@/lib/layout";
import { fx } from "./fx";
import { positionShader, velocityShader, pointsVertex, pointsFragment } from "./shaders/particles";

type Props = {
  quality: Quality;
  targets: Float32Array[];
  reduced: boolean;
  /** Repeat visit: assemble quickly without the full "big bang" intro. */
  shortIntro: boolean;
  children?: ReactNode;
};

const C1 = new THREE.Color("#22e4ff"); // electric cyan
const C2 = new THREE.Color("#7c5cff"); // violet
const C3 = new THREE.Color("#ff5cc8"); // soft magenta

export function Particles({ quality, targets, reduced, shortIntro, children }: Props) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = quality.size;
  const count = size * size;
  const group = useRef<THREE.Group>(null);

  // ── GPGPU setup ────────────────────────────────────────────
  const sim = useMemo(() => {
    const gpu = new GPUComputationRenderer(size, size, gl);
    const canFloat = gl.capabilities.isWebGL2 && !!gl.extensions.get("EXT_color_buffer_float");
    gpu.setDataType(canFloat ? THREE.FloatType : THREE.HalfFloatType);

    const pos0 = gpu.createTexture();
    const vel0 = gpu.createTexture();
    const p = pos0.image.data as Float32Array;
    for (let i = 0; i < count; i++) {
      const seed = Math.random();
      if (shortIntro || reduced) {
        // Start as a loose nebula that condenses into the sculpture.
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const r = reduced ? 0 : 2.5 + Math.random() * 3;
        const t = targets[0];
        p[i * 4] = reduced ? t[i * 4] : s * Math.cos(th) * r;
        p[i * 4 + 1] = reduced ? t[i * 4 + 1] : u * r;
        p[i * 4 + 2] = reduced ? t[i * 4 + 2] : s * Math.sin(th) * r;
      } else {
        // Everything starts as one bright point of light.
        p[i * 4] = (Math.random() - 0.5) * 0.02;
        p[i * 4 + 1] = (Math.random() - 0.5) * 0.02;
        p[i * 4 + 2] = (Math.random() - 0.5) * 0.02;
      }
      p[i * 4 + 3] = seed;
    }

    const velVar = gpu.addVariable("textureVelocity", velocityShader, vel0);
    const posVar = gpu.addVariable("texturePosition", positionShader, pos0);
    gpu.setVariableDependencies(velVar, [posVar, velVar]);
    gpu.setVariableDependencies(posVar, [posVar, velVar]);

    const tex = targets.map((arr) => {
      const t = new THREE.DataTexture(arr, size, size, THREE.RGBAFormat, THREE.FloatType);
      t.needsUpdate = true;
      return t;
    });

    const vu = velVar.material.uniforms;
    Object.assign(vu, {
      uTime: { value: 0 },
      uDelta: { value: 0.016 },
      uTargetA: { value: tex[0] },
      uTargetB: { value: tex[0] },
      uMorph: { value: 1 },
      uScatter: { value: 0 },
      uSpring: { value: reduced ? 1 : 0 },
      uCurl: { value: 0 },
      uImpulse: { value: 0 },
      uBreath: { value: 0.06 },
      uRayO: { value: new THREE.Vector3(0, 0, 10) },
      uRayD: { value: new THREE.Vector3(0, 0, -1) },
      uMouse: { value: 0 },
      uMouseRadius: { value: 0.55 },
      uAttractor: { value: new THREE.Vector3() },
      uAttract: { value: 0 },
      uExplode: { value: 0 },
    });
    posVar.material.uniforms.uDelta = { value: 0.016 };

    const err = gpu.init();
    if (err) console.warn("[particles]", err);
    return { gpu, velVar, posVar, tex };
  }, [gl, size, count, targets, shortIntro, reduced]);

  useEffect(() => () => {
    sim.gpu.dispose();
    sim.tex.forEach((t) => t.dispose());
  }, [sim]);

  // ── Render geometry/material ──────────────────────────────
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const ref = new Float32Array(count * 2);
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      ref[i * 2] = ((i % size) + 0.5) / size;
      ref[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
      rnd[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    // Fewer particles → slightly bigger points so the form keeps its density.
    const sizeScale = Math.sqrt(102400 / count);
    const m = new THREE.ShaderMaterial({
      vertexShader: pointsVertex,
      fragmentShader: pointsFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPos: { value: null },
        uVel: { value: null },
        uSize: { value: 11 * Math.min(sizeScale, 2.1) },
        uPixelRatio: { value: 1 },
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uOpacity: { value: 0 },
        uC1: { value: C1 },
        uC2: { value: C2 },
        uC3: { value: C3 },
      },
    });
    return { geometry: g, material: m };
  }, [count, size]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  // ── Intro + morph choreography (GSAP) ─────────────────────
  const ctl = useRef({
    shapeA: 0,
    shapeB: 0,
    morphTween: null as gsap.core.Tween | null,
    intro: null as gsap.core.Timeline | null,
    impulse: 0,
    explode: 0,
    attract: 0,
    mouse: 0,
    baseCurl: reduced ? 0.05 : 0.14,
    opacity: 0,
    spin: 0,
    rotZ: 0,
  });

  useEffect(() => {
    const vu = sim.velVar.material.uniforms;
    const mu = material.uniforms;
    const c = ctl.current;
    const runIntro = () => {
      c.intro?.kill();
      const tl = gsap.timeline({
        onComplete: () => setUI({ phase: "ready" }),
      });
      c.intro = tl;
      if (reduced) {
        vu.uSpring.value = 1;
        vu.uCurl.value = c.baseCurl;
        tl.to(c, { opacity: 1, duration: 0.8 }).call(() => setUI({ phase: "ready" }), [], 0.2);
        return;
      }
      if (shortIntro) {
        tl.set(c, { opacity: 0 })
          .to(c, { opacity: 1, duration: 0.6 }, 0)
          .to(vu.uCurl, { value: 2.2, duration: 0.3 }, 0)
          .to(vu.uSpring, { value: 1, duration: 1.3, ease: "power2.inOut" }, 0.1)
          .to(vu.uCurl, { value: c.baseCurl, duration: 1.2 }, 0.5)
          .to(fx, { flash: 1, duration: 0.15, ease: "power2.out" }, 0.9)
          .to(fx, { flash: 0, duration: 0.9, ease: "power2.inOut" }, 1.05)
          .call(() => setUI({ phase: "ready" }), [], 0.85);
        return;
      }
      // 1. A single point of light appears and pulses once.
      tl.set(c, { opacity: 1 })
        .fromTo(mu.uPulse, { value: 0 }, { value: 1.6, duration: 0.35, ease: "power3.out" }, 0)
        .to(mu.uPulse, { value: 0.5, duration: 0.18, ease: "power2.in" }, 0.35)
        .to(mu.uPulse, { value: 1.4, duration: 0.12, ease: "power2.out" }, 0.53)
        // 2. Burst outward into curl-noise currents.
        .call(() => (c.impulse = 4.2), [], 0.62)
        .to(mu.uPulse, { value: 0, duration: 0.5, ease: "power2.out" }, 0.62)
        .to(vu.uCurl, { value: 1.8, duration: 0.25 }, 0.62)
        // 3. Pull back together into the sculpture, with a bloom flash.
        .to(vu.uSpring, { value: 1, duration: 1.2, ease: "power2.inOut" }, 1.05)
        .to(vu.uCurl, { value: c.baseCurl, duration: 1.4, ease: "power2.inOut" }, 1.3)
        .to(fx, { flash: 1, duration: 0.18, ease: "power2.out" }, 2.05)
        .to(fx, { flash: 0, duration: 1.0, ease: "power2.inOut" }, 2.23)
        // 4. Name fades in while the form settles.
        .call(() => setUI({ phase: "ready" }), [], 2.25);
    };
    const off = onScene((e) => {
      if (e === "intro") runIntro();
      if (e === "skip" && c.intro) {
        c.intro.progress(1);
        mu.uPulse.value = 0;
        fx.flash = 0;
      }
    });
    return () => {
      off();
      c.intro?.kill();
    };
  }, [sim, material, reduced, shortIntro]);

  // ── Per-frame update ──────────────────────────────────────
  const tmp = useMemo(
    () => ({
      pose: makePose(),
      ray: new THREE.Ray(),
      inv: new THREE.Matrix4(),
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      hit: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      raycaster: new THREE.Raycaster(),
    }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const vu = sim.velVar.material.uniforms;
    const mu = material.uniforms;
    const c = ctl.current;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 20);
    const ui = getUI();

    // Section pose (position / scale / opacity) follows scroll smoothly.
    const pose = poseAt(frame.section, quality.mobile, tmp.pose);
    const k = 1 - Math.exp(-dt * 4);
    g.position.x += (pose.x - g.position.x) * k;
    g.position.y += (pose.y - g.position.y) * k;
    g.position.z += (pose.z - g.position.z) * k;
    const s = g.scale.x + (pose.scale - g.scale.x) * k;
    g.scale.setScalar(s);

    // Gentle idle rotation + cursor / gyro parallax. The portal spins in Contact.
    const contactW = Math.max(0, 1 - Math.abs(frame.section - 5));
    c.spin += dt * (reduced ? 0 : 0.05);
    // The portal spins in Contact, then eases back to the nearest full turn.
    if (contactW > 0.05 && !reduced) c.rotZ += dt * 0.28 * contactW;
    else c.rotZ += (Math.round(c.rotZ / (Math.PI * 2)) * Math.PI * 2 - c.rotZ) * k;
    const px = quality.mobile ? frame.tilt.x : frame.pointer.x;
    const py = quality.mobile ? frame.tilt.y : frame.pointer.y;
    const targetRY = (reduced ? 0 : Math.sin(c.spin) * 0.35) + px * 0.25;
    const targetRX = -py * 0.15;
    g.rotation.y += (targetRY - g.rotation.y) * k;
    g.rotation.x += (targetRX - g.rotation.x) * k;
    g.rotation.z = c.rotZ;

    // Morph to the shape of the section that is mostly on screen.
    const want = SHAPES.indexOf(SECTION_SHAPES[Math.round(frame.section)]);
    if (want !== c.shapeB && ui.phase !== "loading") {
      c.shapeA = c.shapeB;
      c.shapeB = want;
      vu.uTargetA.value = sim.tex[c.shapeA];
      vu.uTargetB.value = sim.tex[want];
      vu.uMorph.value = 0;
      vu.uScatter.value = 0;
      c.morphTween?.kill();
      if (reduced) {
        vu.uMorph.value = 1;
      } else {
        const tw = { p: 0 };
        c.morphTween = gsap.to(tw, {
          p: 1,
          duration: 1.7,
          ease: "power2.inOut",
          onUpdate: () => {
            vu.uMorph.value = tw.p;
            // Short "scatter then reassemble" moment in the middle of the morph.
            vu.uScatter.value = Math.pow(Math.sin(Math.PI * Math.min(1, tw.p * 1.15)), 2) * 0.85;
          },
          onComplete: () => {
            vu.uScatter.value = 0;
          },
        });
      }
    }

    // Mouse ray in the particles' local space.
    g.updateMatrixWorld();
    tmp.ndc.set(frame.pointer.x, frame.pointer.y);
    tmp.raycaster.setFromCamera(tmp.ndc, camera);
    tmp.inv.copy(g.matrixWorld).invert();
    tmp.ray.copy(tmp.raycaster.ray).applyMatrix4(tmp.inv);
    vu.uRayO.value.copy(tmp.ray.origin);
    vu.uRayD.value.copy(tmp.ray.direction);
    const mouseOn = frame.pointer.inside && ui.phase === "ready" && !ui.detail ? 1 : 0;
    c.mouse += (mouseOn * (reduced ? 0.25 : 1) * Math.min(1, 0.35 + frame.pointer.speed * 2) - c.mouse) * (1 - Math.exp(-dt * 6));
    vu.uMouse.value = c.mouse;

    // Hold → black hole, release → explosion.
    const holding = frame.pointer.down && ui.phase === "ready" && !ui.detail && !reduced;
    const prevAttract = c.attract;
    c.attract += ((holding ? 1 : 0) - c.attract) * (1 - Math.exp(-dt * (holding ? 2.5 : 12)));
    if (!holding && prevAttract > 0.25) c.explode = prevAttract * 5;
    if (tmp.ray.intersectPlane(tmp.plane, tmp.hit)) vu.uAttractor.value.lerp(tmp.hit, holding ? 0.2 : 1);
    vu.uAttract.value = c.attract;
    fx.hold = c.attract;

    vu.uImpulse.value = c.impulse;
    vu.uExplode.value = c.explode;
    c.impulse = 0;
    c.explode = 0;

    vu.uTime.value = t;
    vu.uDelta.value = dt;
    vu.uBreath.value = reduced ? 0 : pose.breath;
    sim.posVar.material.uniforms.uDelta.value = dt;
    sim.gpu.compute();

    mu.uPos.value = sim.gpu.getCurrentRenderTarget(sim.posVar).texture;
    mu.uVel.value = sim.gpu.getCurrentRenderTarget(sim.velVar).texture;
    mu.uTime.value = t;
    mu.uPixelRatio.value = state.gl.getPixelRatio();
    const detailDim = ui.detail ? 0.35 : 1;
    const baseOpacity = 0.85 * Math.min(Math.sqrt(102400 / count), 1.8);
    const targetOp = baseOpacity * pose.opacity * c.opacity * detailDim;
    mu.uOpacity.value += (targetOp - mu.uOpacity.value) * (1 - Math.exp(-dt * 5));
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
      {children}
    </group>
  );
}

