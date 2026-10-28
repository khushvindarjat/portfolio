"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useUI } from "@/lib/store";

const noop = () => () => {};

/** Small dot + trailing ring. The ring grows and shows a label on hover ("view", "drag", "open"…). */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const sceneLabel = useUI((s) => s.cursor);
  const [domLabel, setDomLabel] = useState<string | null>(null);
  const [hot, setHot] = useState(false);
  const [down, setDown] = useState(false);
  const enabled = useSyncExternalStore(
    noop,
    () => window.matchMedia("(pointer: fine)").matches,
    () => false,
  );

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-cursor");
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { ...pos };
    let raf = 0;
    let visible = false;

    const move = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        if (dot.current) dot.current.style.opacity = "1";
        if (ring.current) ring.current.style.opacity = "1";
      }
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor], a, button, input, textarea, label");
      setDomLabel(el?.dataset.cursor ?? null);
      setHot(!!el);
    };
    const leave = () => {
      visible = false;
      if (dot.current) dot.current.style.opacity = "0";
      if (ring.current) ring.current.style.opacity = "0";
    };
    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.2;
      ringPos.y += (pos.y - ringPos.y) * 0.2;
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    const pd = () => setDown(true);
    const pu = () => setDown(false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", pd);
    window.addEventListener("pointerup", pu);
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointerup", pu);
      document.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  const label = sceneLabel ?? domLabel;
  const size = label ? 76 : hot ? 46 : 30;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      <div ref={ring} className="absolute top-0 left-0 opacity-0" style={{ willChange: "transform" }}>
        <div
          className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-[width,height,background-color,border-color] duration-300 ease-out-expo"
          style={{
            width: size * (down ? 0.86 : 1),
            height: size * (down ? 0.86 : 1),
            borderColor: label ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.35)",
            background: label ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.02)",
            backdropFilter: label ? "none" : "blur(2px)",
          }}
        >
          <span
            className="font-mono text-[10px] font-medium tracking-[0.16em] text-ink uppercase transition-opacity duration-200"
            style={{ opacity: label ? 1 : 0 }}
          >
            {label}
          </span>
        </div>
      </div>
      <div ref={dot} className="absolute top-0 left-0 opacity-0" style={{ willChange: "transform" }}>
        <div
          className="h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-opacity"
          style={{ opacity: label ? 0 : 1 }}
        />
      </div>
    </div>
  );
}
