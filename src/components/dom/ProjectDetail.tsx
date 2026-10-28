"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { projects } from "@/content/data";
import { setUI, useUI } from "@/lib/store";
import { lockScroll } from "@/lib/scroll";
import { sfx } from "@/lib/sound";

const ease = [0.16, 1, 0.3, 1] as const;

/** Case-study panel shown after the camera flies into a glass panel. */
export function ProjectDetail({ webgl }: { webgl: boolean }) {
  const id = useUI((s) => s.detail);
  const p = projects.find((x) => x.id === id) ?? null;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!p) return;
    lockScroll(true);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 400);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUI({ detail: null });
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      lockScroll(false);
      prev?.focus?.({ preventScroll: true });
    };
  }, [p]);

  const close = () => {
    sfx.click();
    setUI({ detail: null });
  };

  return (
    <AnimatePresence>
      {p && (
        <motion.div
          key={p.id}
          className="fixed inset-0 z-[60] flex items-end md:items-stretch md:justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Click outside to close; the 3D panel stays visible on the left. */}
          <button type="button" aria-label="Close project" className="absolute inset-0 cursor-default" onClick={close} tabIndex={-1} />
          <motion.article
            data-lenis-prevent
            className="glass relative m-3 max-h-[62svh] w-full overflow-y-auto rounded-3xl p-6 md:m-5 md:max-h-none md:w-[min(560px,46vw)] md:p-10"
            style={{ background: "linear-gradient(180deg, rgba(10,12,22,0.9), rgba(8,9,16,0.95))" }}
            initial={{ x: 40, opacity: 0, filter: "blur(10px)" }}
            animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ x: 30, opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.7, delay: 0.25, ease }}
          >
            <div className="mb-8 flex items-center justify-between">
              <span className="label">
                {String(projects.indexOf(p) + 1).padStart(2, "0")} — {p.year}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] text-white/75 uppercase transition hover:border-white/40 hover:text-white"
                data-cursor="close"
              >
                Close <span aria-hidden>✕</span>
              </button>
            </div>

            {!webgl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={`${p.title} screenshot`} className="mb-6 aspect-[16/10] w-full rounded-xl object-cover object-top" />
            )}

            <div className="label mb-2">{p.role}</div>
            <h2 id="detail-title" className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
              {p.title}
            </h2>
            <p className="mt-5 leading-relaxed text-soft">{p.description}</p>

            <h3 className="label mt-9 mb-4">What I did</h3>
            <ul className="space-y-3">
              {p.contributions.map((c, i) => (
                <li key={i} className="flex gap-3 leading-relaxed text-white/85">
                  <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-cyan" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>

            <h3 className="label mt-9 mb-3">Stack</h3>
            <ul className="flex flex-wrap gap-2">
              {p.stack.map((s) => (
                <li key={s} className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-white/80">
                  {s}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={p.github}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-5 py-3 font-mono text-[11px] tracking-[0.16em] text-ink uppercase transition hover:bg-cyan"
                data-cursor="open"
              >
                GitHub ↗
              </a>
              {p.live && (
                <a
                  href={p.live}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-5 py-3 font-mono text-[11px] tracking-[0.16em] text-white uppercase transition hover:border-white/50"
                  data-cursor="open"
                >
                  Live demo ↗
                </a>
              )}
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
