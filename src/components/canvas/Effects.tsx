"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction, type BloomEffect, type ChromaticAberrationEffect } from "postprocessing";
import * as THREE from "three";
import { fx } from "./fx";

export function Effects({ mode }: { mode: "full" | "lite" }) {
  const bloom = useRef<BloomEffect>(null);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const offset = useMemo(() => new THREE.Vector2(0.0012, 0.0012), []);

  useFrame(() => {
    if (bloom.current) bloom.current.intensity = 0.95 + fx.flash * 2.6 + fx.hold * 0.5;
    if (ca.current) {
      const o = 0.0011 + fx.hold * 0.004 + fx.flash * 0.002;
      ca.current.offset.set(o, o);
    }
  });

  if (mode === "lite") {
    return (
      <EffectComposer multisampling={0} depthBuffer={false}>
        <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.22} luminanceSmoothing={0.3} radius={0.7} intensity={0.95} />
        <Vignette offset={0.28} darkness={0.75} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0} depthBuffer={false}>
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.22} luminanceSmoothing={0.35} radius={0.75} intensity={0.95} />
      <ChromaticAberration
        ref={ca}
        offset={offset}
        radialModulation
        modulationOffset={0.35}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.06} />
      <Vignette offset={0.26} darkness={0.78} />
    </EffectComposer>
  );
}
