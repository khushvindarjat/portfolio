"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { projects } from "@/content/data";
import { frame, getUI, setUI, useUI } from "@/lib/store";
import { carouselMetrics, currentScroll, getLenis, scrollToY } from "@/lib/scroll";
import { sfx } from "@/lib/sound";
import { dragGuard } from "../canvas/ProjectRing";
import { Reveal, SectionLabel } from "./Reveal";

const ease = [0.16, 1, 0.3, 1] as const;

function goTo(i: number) {
  const m = carouselMetrics();
  if (!m) return;
  const idx = Math.max(0, Math.min(m.count - 1, i));
  scrollToY(m.top + idx * m.step);
}

/** Drag anywhere on the pinned stage to spin the ring; release snaps to the nearest panel. */
function useCarouselControls() {
  useEffect(() => {
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let snapTimer: ReturnType<typeof setTimeout> | null = null;

    const inProjects = () => Math.abs(frame.section - 2) < 0.01;
    const snap = () => {
      if (dragging || getUI().detail || !inProjects()) return;
      const near = Math.round(frame.carousel);
      if (Math.abs(frame.carousel - near) > 0.02) goTo(near);
    };
    const scheduleSnap = () => {
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(snap, 220);
    };

    const down = (e: PointerEvent) => {
      if (!inProjects() || getUI().detail) return;
      if ((e.target as HTMLElement).closest("a,button,input,textarea")) return;
      dragging = true;
      dragGuard.moved = false;
      startX = e.clientX;
      startScroll = currentScroll();
      setUI({ cursor: "drag" });
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const m = carouselMetrics();
      if (!m) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) dragGuard.moved = true;
      // One panel per ~third of the screen width.
      const perPx = m.step / (window.innerWidth * 0.33);
      const y = Math.max(m.top, Math.min(m.top + m.step * (m.count - 1), startScroll - dx * perPx));
      scrollToY(y, true);
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      setUI({ cursor: null });
      if (dragGuard.moved) sfx.whoosh();
      scheduleSnap();
      setTimeout(() => (dragGuard.moved = false), 50);
    };
    const goto = (e: Event) => goTo((e as CustomEvent<number>).detail);
    const key = (e: KeyboardEvent) => {
      if (!inProjects() || getUI().detail) return;
      if (e.key === "ArrowRight") goTo(Math.round(frame.carousel) + 1);
      if (e.key === "ArrowLeft") goTo(Math.round(frame.carousel) - 1);
    };

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("carousel:goto", goto);
    window.addEventListener("keydown", key);
    const lenis = getLenis();
    const offScroll = lenis ? lenis.on("scroll", scheduleSnap) : null;
    if (!lenis) window.addEventListener("scroll", scheduleSnap, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("carousel:goto", goto);
      window.removeEventListener("keydown", key);
      offScroll?.();
      window.removeEventListener("scroll", scheduleSnap);
      if (snapTimer) clearTimeout(snapTimer);
    };
  }, []);
}

function Stage() {
  const active = useUI((s) => s.activeProject);
  const detail = useUI((s) => s.detail);
  const p = projects[active];
  useCarouselControls();
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={stageRef} className="pointer-events-none sticky top-0 flex h-[100svh] flex-col justify-between px-5 pt-24 pb-8 md:px-10 md:pt-28 md:pb-10">
      <motion.div animate={{ opacity: detail ? 0 : 1 }} transition={{ duration: 0.4 }} className="flex items-start justify-between gap-6">
        <Reveal>
          <SectionLabel index="02">Selected work</SectionLabel>
          <h2 className="shade max-w-[14ch] text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.95] font-semibold tracking-[-0.03em]">
            Things I&apos;ve built &amp; <span className="text-gradient">shipped.</span>
          </h2>
        </Reveal>
        <div className="label hidden pt-1 text-right md:block">
          Drag · scroll · ← →
          <br />
          to rotate
        </div>
      </motion.div>

      <motion.div animate={{ opacity: detail ? 0 : 1, y: detail ? 20 : 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-h-[8.5rem] max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease }}
            >
              <div className="label mb-2 flex items-center gap-3">
                <span className="text-white/80 tabular-nums">
                  {String(active + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
                </span>
                {p.featured && <span className="rounded-full border border-cyan/40 px-2 py-0.5 !text-cyan">Featured</span>}
                <span>{p.role}</span>
              </div>
              <h3 className="shade text-3xl font-semibold tracking-tight md:text-4xl">{p.title}</h3>
              <p className="shade mt-2 text-soft">{p.summary}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            className="glass flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:text-white disabled:opacity-30"
            aria-label="Previous project"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === projects.length - 1}
            className="glass flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:text-white disabled:opacity-30"
            aria-label="Next project"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.click();
              setUI({ detail: p.id });
            }}
            className="ml-1 rounded-full bg-white px-5 py-3 font-mono text-[11px] tracking-[0.16em] text-ink uppercase transition hover:bg-cyan"
            data-cursor="open"
          >
            Open case
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** Static grid used when WebGL is unavailable. */
function Grid() {
  return (
    <div className="px-5 py-28 md:px-10">
      <Reveal>
        <SectionLabel index="02">Selected work</SectionLabel>
        <h2 className="mb-12 text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.95] font-semibold tracking-[-0.03em]">
          Things I&apos;ve built &amp; <span className="text-gradient">shipped.</span>
        </h2>
      </Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        {projects.map((p, i) => (
          <Reveal key={p.id} delay={(i % 2) * 0.08}>
            <button
              type="button"
              onClick={() => setUI({ detail: p.id })}
              className="glass group block w-full overflow-hidden rounded-2xl text-left"
              data-cursor="open"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={`${p.title} screenshot`} loading="lazy" className="aspect-[16/10] w-full object-cover object-top opacity-85 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100" />
              <div className="p-5">
                <div className="label mb-2">{p.role}</div>
                <h3 className="text-2xl font-semibold">{p.title}</h3>
                <p className="mt-1 text-soft">{p.summary}</p>
              </div>
            </button>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export function Projects({ webgl }: { webgl: boolean }) {
  if (!webgl) {
    return (
      <section id="projects" data-count={projects.length} className="relative">
        <Grid />
      </section>
    );
  }
  return (
    <section
      id="projects"
      data-count={projects.length}
      className="relative"
      style={{ height: `calc(100svh + ${(projects.length - 1) * 60}svh)` }}
      aria-label="Projects"
    >
      <Stage />
      {/* Accessible list of the same projects for screen readers / no-JS. */}
      <ul className="sr-only">
        {projects.map((p) => (
          <li key={p.id}>
            <a href={p.github}>{p.title}</a> — {p.summary}
          </li>
        ))}
      </ul>
    </section>
  );
}
