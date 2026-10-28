"use client";

import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS, frame, getUI, setUI } from "./store";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: "smooth" });
}

export function scrollToY(y: number, immediate = false) {
  if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 0.9, force: true });
  else window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
}

export function lockScroll(lock: boolean) {
  if (lenis) {
    if (lock) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = lock ? "hidden" : "";
}

/**
 * Maps scroll position to a continuous section index.
 * While a section fully covers the viewport the value rests on its index;
 * it moves to the next index while the next section scrolls in.
 */
function computeSection(y: number, tops: number[], vh: number) {
  for (let i = 0; i < tops.length - 1; i++) {
    const start = tops[i + 1] - vh;
    const end = tops[i + 1];
    if (y < start) return i;
    if (y < end) return i + (y - start) / Math.max(1, end - start);
  }
  return tops.length - 1;
}

/** Sets up Lenis + ScrollTrigger and keeps `frame.section` / `frame.carousel` updated. */
export function initScroll(smooth: boolean) {
  if (smooth) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  let tops: number[] = [];
  let vh = window.innerHeight;
  const measure = () => {
    vh = window.innerHeight;
    tops = SECTION_IDS.map((id) => {
      const el = document.getElementById(id);
      return el ? el.getBoundingClientRect().top + window.scrollY : 0;
    });
  };
  measure();

  const update = () => {
    const y = lenis ? lenis.animatedScroll : window.scrollY;
    frame.section = computeSection(y, tops, vh);
    const active = Math.round(frame.section);
    if (getUI().activeSection !== active) setUI({ activeSection: active });

    // Carousel progress inside the pinned projects section.
    const proj = document.getElementById("projects");
    if (proj) {
      const count = Number(proj.dataset.count || 1);
      const top = tops[2];
      const len = proj.offsetHeight - vh;
      const p = Math.max(0, Math.min(1, (y - top) / Math.max(1, len)));
      frame.carousel = p * (count - 1);
      const ap = Math.round(frame.carousel);
      if (getUI().activeProject !== ap) setUI({ activeProject: ap });
    }
  };

  // One ScrollTrigger spanning the page drives the scene timing.
  const st = ScrollTrigger.create({
    trigger: document.body,
    start: 0,
    end: "max",
    onUpdate: update,
    onRefresh: () => {
      measure();
      update();
    },
  });

  const ro = new ResizeObserver(() => ScrollTrigger.refresh());
  ro.observe(document.body);
  update();

  function tick(time: number) {
    lenis?.raf(time * 1000);
    update();
  }

  return () => {
    st.kill();
    ro.disconnect();
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

/** Top of the projects section + distance per project, for drag & snapping. */
export function carouselMetrics() {
  const el = document.getElementById("projects");
  if (!el) return null;
  const count = Number(el.dataset.count || 1);
  const top = el.getBoundingClientRect().top + (lenis ? lenis.animatedScroll : window.scrollY);
  const len = el.offsetHeight - window.innerHeight;
  return { top, step: len / Math.max(1, count - 1), count };
}

export function currentScroll() {
  return lenis ? lenis.animatedScroll : window.scrollY;
}
