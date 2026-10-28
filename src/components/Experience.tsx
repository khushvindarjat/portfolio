"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type * as THREE from "three";
import { emitScene, frame, getUI, setUI, useUI, type Quality } from "@/lib/store";
import { detectQuality, hasWebGL2 } from "@/lib/quality";
import { initScroll, lockScroll } from "@/lib/scroll";
import { Loader } from "./dom/Loader";
import { Cursor } from "./dom/Cursor";
import { Nav } from "./dom/Nav";
import { Hero } from "./dom/Hero";
import { About } from "./dom/About";
import { Projects } from "./dom/Projects";
import { ProjectDetail } from "./dom/ProjectDetail";
import { OpenSource } from "./dom/OpenSource";
import { Skills } from "./dom/Skills";
import { Contact } from "./dom/Contact";

const SEEN_KEY = "ksc:intro-seen";
const noop = () => () => {};

type SceneProps = {
  quality: Quality;
  targets: Float32Array[];
  textures: THREE.Texture[];
  reduced: boolean;
  shortIntro: boolean;
  onReady: () => void;
  onContextLost: () => void;
};

type Loaded = { Scene: ComponentType<SceneProps>; targets: Float32Array[]; textures: THREE.Texture[]; quality: Quality };

/** Pointer, touch and gyroscope → `frame` values read by the scene. */
function usePointer() {
  useEffect(() => {
    let lastX = 0, lastY = 0, lastT = performance.now();
    const isInteractive = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.("a,button,input,textarea,label,[role=dialog]");
    const move = (e: PointerEvent) => {
      const x = (e.clientX / innerWidth) * 2 - 1;
      const y = -(e.clientY / innerHeight) * 2 + 1;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const sp = Math.hypot(x - lastX, y - lastY) / dt * 16;
      frame.pointer.speed += (Math.min(1, sp * 6) - frame.pointer.speed) * 0.3;
      frame.pointer.x = x;
      frame.pointer.y = y;
      frame.pointer.inside = e.pointerType === "mouse" || e.buttons > 0;
      lastX = x; lastY = y; lastT = now;
    };
    const down = (e: PointerEvent) => {
      move(e);
      frame.pointer.inside = true;
      // Hold-to-pull is disabled on the projects stage (drag spins the ring there).
      if (!isInteractive(e.target) && Math.abs(frame.section - 2) > 0.3) frame.pointer.down = true;
    };
    const up = (e: PointerEvent) => {
      frame.pointer.down = false;
      if (e.pointerType !== "mouse") frame.pointer.inside = false;
    };
    const leave = () => {
      frame.pointer.inside = false;
      frame.pointer.down = false;
    };
    const decay = setInterval(() => (frame.pointer.speed *= 0.85), 100);

    // Gyroscope tilt on phones (iOS asks for permission on the first tap).
    const orient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      frame.tilt.x = Math.max(-1, Math.min(1, e.gamma / 30));
      frame.tilt.y = Math.max(-1, Math.min(1, (e.beta - 50) / 30));
    };
    const askGyro = () => {
      const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (D?.requestPermission) D.requestPermission().then((r) => r === "granted" && window.addEventListener("deviceorientation", orient)).catch(() => {});
      window.removeEventListener("touchend", askGyro);
    };
    window.addEventListener("deviceorientation", orient);
    window.addEventListener("touchend", askGyro);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      clearInterval(decay);
      window.removeEventListener("deviceorientation", orient);
      window.removeEventListener("touchend", askGyro);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, []);
}

/** Calm CSS backdrop used when WebGL is unavailable. */
function FallbackBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: "conic-gradient(from 200deg, #22e4ff55, #7c5cff66, #ff5cc855, #22e4ff55)" }}
      />
      <div
        className="absolute top-1/2 left-1/2 h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        style={{ boxShadow: "inset 0 0 80px #7c5cff44, 0 0 120px #22e4ff22" }}
      />
    </div>
  );
}

export default function Experience() {
  const phase = useUI((s) => s.phase);
  const webgl = useUI((s) => s.webgl);
  const reduced = useUI((s) => s.reduced);
  const skipIntro = useUI((s) => s.skipIntro);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // false during SSR/hydration, true on the client afterwards.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const sceneReady = useRef(false);

  usePointer();

  // ── Boot: detect capability, load the scene chunk, build shapes, load textures ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("reduced");
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (params.has("intro")) seen = false;
    setUI({ reduced: reducedMotion, skipIntro: seen });

    let cancelled = false;
    const progress = (p: number) => !cancelled && setUI({ progress: Math.max(getUI().progress, p) });

    (async () => {
      const fail = () => {
        setUI({ webgl: false, progress: 1 });
      };
      if (!hasWebGL2() || params.has("nowebgl")) return fail();
      progress(0.05);
      const quality = await detectQuality();
      if (cancelled) return;
      if (!quality) return fail();
      setUI({ quality });
      progress(0.15);
      const [{ default: Scene }, prep] = await Promise.all([import("./canvas/Scene"), import("./canvas/prepare")]);
      progress(0.35);
      const count = quality.size * quality.size;
      const [targets, textures] = await Promise.all([
        prep.buildTargets(count, (p) => progress(0.35 + p * 0.35)),
        prep.loadTextures((p) => progress(0.7 + p * 0.1)),
        document.fonts?.ready,
      ]);
      if (cancelled) return;
      progress(0.86);
      setLoaded({ Scene, targets, textures, quality });
    })().catch((e) => {
      console.warn("[experience] falling back to static layout", e);
      setUI({ webgl: false, progress: 1 });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Smooth scroll (off for reduced motion). Locked while the intro plays.
  useEffect(() => {
    if (!mounted) return;
    const cleanup = initScroll(!reduced);
    return cleanup;
  }, [mounted, reduced]);

  useEffect(() => {
    lockScroll(phase !== "ready");
    if (phase === "ready") {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {}
    }
  }, [phase]);

  const onSceneReady = useCallback(() => {
    sceneReady.current = true;
    setUI({ progress: 1 });
  }, []);

  const onLoaderDone = useCallback(() => {
    if (!getUI().webgl) {
      setUI({ phase: "ready" });
      return;
    }
    setUI({ phase: "intro" });
    emitScene("intro");
  }, []);

  // Context lost → keep the content, drop the canvas.
  const onContextLost = useCallback(() => {
    setUI({ webgl: false, phase: "ready" });
    setLoaded(null);
  }, []);

  const Scene = loaded?.Scene;

  return (
    <>
      {webgl && Scene && loaded && (
        <div className="js-only" aria-hidden>
          <Scene
            quality={loaded.quality}
            targets={loaded.targets}
            textures={loaded.textures}
            reduced={reduced}
            shortIntro={skipIntro}
            onReady={onSceneReady}
            onContextLost={onContextLost}
          />
        </div>
      )}
      {!webgl && <FallbackBackdrop />}

      <Cursor />
      <Nav />

      <main className="relative z-10">
        <Hero />
        <About />
        <Projects webgl={webgl} />
        <OpenSource />
        <Skills webgl={webgl} />
        <Contact />
      </main>

      <ProjectDetail webgl={webgl} />

      <AnimatePresence>
        {phase === "intro" && (
          <motion.button
            type="button"
            onClick={() => emitScene("skip")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.4 } }}
            exit={{ opacity: 0 }}
            className="label fixed right-5 bottom-5 z-[70] rounded-full border border-white/15 px-4 py-2 transition hover:border-white/40 hover:text-white md:right-10 md:bottom-8"
          >
            Skip intro →
          </motion.button>
        )}
      </AnimatePresence>

      {mounted && phase === "loading" && <Loader onDone={onLoaderDone} />}
      {!mounted && <div className="js-only fixed inset-0 z-[100] bg-ink" />}
    </>
  );
}

