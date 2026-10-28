"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { frame, type Quality } from "@/lib/store";
import { Particles } from "./Particles";
import { InkBackground } from "./InkBackground";
import { CameraRig } from "./CameraRig";
import { ProjectRing } from "./ProjectRing";
import { SkillGraph } from "./SkillGraph";
import { Effects } from "./Effects";

type Props = {
  quality: Quality;
  targets: Float32Array[];
  textures: THREE.Texture[];
  reduced: boolean;
  shortIntro: boolean;
  onReady: () => void;
  onContextLost: () => void;
};

/** Signals "ready" once shaders are compiled and a few frames have rendered. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  const done = useRef(false);
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera]);
  useFrame(() => {
    if (done.current) return;
    if (++n.current > 4) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

/** Rolling FPS counter (exposed as window.__fps for automated perf checks). */
function FpsMeter() {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, delta) => {
    acc.current.t += delta;
    acc.current.n++;
    if (acc.current.t >= 0.5) {
      frame.fps = acc.current.n / acc.current.t;
      (window as unknown as { __fps: number }).__fps = Math.round(frame.fps);
      acc.current = { t: 0, n: 0 };
    }
  });
  return null;
}

export default function Scene({ quality, targets, textures, reduced, shortIntro, onReady, onContextLost }: Props) {
  const [dpr, setDpr] = useState(quality.dpr[1]);
  const [post, setPost] = useState(quality.post);

  return (
    <Canvas
      className="!fixed inset-0"
      dpr={dpr}
      flat
      camera={{ fov: 35, position: [0, 0, 6.5], near: 0.1, far: 60 }}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#05060a");
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onContextLost();
        });
      }}
      // DOM content sits above the canvas, so listen on <body> and raycast by client coords.
      eventSource={document.body}
      eventPrefix="client"
    >
      <PerformanceMonitor
        bounds={() => [45, 58]}
        flipflops={3}
        onDecline={() => {
          // Step down gracefully: resolution first, then post-processing.
          setDpr((d) => {
            const next = Math.max(quality.dpr[0], +(d - 0.25).toFixed(2));
            if (next === d) setPost((p) => (p === "full" ? "lite" : "none"));
            return next;
          });
        }}
        onIncline={() => setDpr((d) => Math.min(quality.dpr[1], +(d + 0.25).toFixed(2)))}
      />
      <InkBackground trail={quality.ink && !reduced} />
      <Particles quality={quality} targets={targets} reduced={reduced} shortIntro={shortIntro}>
        <SkillGraph />
      </Particles>
      <ProjectRing quality={quality} textures={textures} />
      <CameraRig mobile={quality.mobile} reduced={reduced} />
      {post !== "none" && <Effects mode={post} />}
      <ReadySignal onReady={onReady} />
      <FpsMeter />
    </Canvas>
  );
}
