"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { projects, skills } from "@/content/data";
import { icons } from "@/content/icons";
import { frame, setUI, useUI } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Reveal, SectionLabel } from "./Reveal";

function Icon({ slug, className }: { slug: string; className?: string }) {
  const icon = icons[slug];
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={icon.path} />
    </svg>
  );
}

const projectTitle = (id: string) => projects.find((p) => p.id === id)?.title ?? id;

function InfoCard() {
  const hover = useUI((s) => s.hoverSkill);
  const sk = skills.find((s) => s.id === hover);
  return (
    <div className="min-h-[9rem]">
      <AnimatePresence mode="wait">
        {sk ? (
          <motion.div
            key={sk.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="glass max-w-xs rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <Icon slug={sk.icon} className="h-5 w-5 text-cyan" />
              <span className="text-xl font-semibold">{sk.label}</span>
            </div>
            <div className="label mt-4 mb-2">Used in</div>
            <ul className="flex flex-wrap gap-1.5">
              {sk.projects.map((id) => (
                <li key={id} className="rounded-full border border-white/12 px-2.5 py-0.5 font-mono text-[11px] text-white/80">
                  {projectTitle(id)}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="label max-w-xs leading-relaxed">
            Hover a node to light up its connections and see where I used it.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Labels that ride on top of the 3D skill nodes. */
function NodeLabels() {
  const wrap = useRef<HTMLDivElement>(null);
  const hover = useUI((s) => s.hoverSkill);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = wrap.current;
      if (el) {
        const w = Math.max(0, 1 - Math.abs(frame.section - 4) * 1.6);
        el.style.opacity = String(w * w);
        el.style.pointerEvents = w > 0.6 ? "auto" : "none";
        const kids = el.children;
        for (let i = 0; i < kids.length; i++) {
          const p = frame.skillScreen[i];
          const k = kids[i] as HTMLElement;
          if (!p) continue;
          k.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
          k.style.visibility = p.visible ? "visible" : "hidden";
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-20 opacity-0" aria-hidden>
      {skills.map((s) => {
        const on = hover === s.id;
        const dim = hover && !on;
        return (
          <button
            key={s.id}
            type="button"
            tabIndex={-1}
            className="absolute top-0 left-0 will-change-transform"
            onPointerEnter={() => {
              setUI({ hoverSkill: s.id });
              sfx.hover();
            }}
            onPointerLeave={() => setUI({ hoverSkill: null })}
            onClick={() => setUI({ hoverSkill: s.id })}
            data-cursor="stack"
          >
            <span
              className={`flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border p-1.5 sm:pr-3 transition-all duration-300 ${
                on ? "scale-110 border-cyan/70 bg-ink/80 shadow-[0_0_24px_rgba(34,228,255,0.45)]" : "border-white/15 bg-ink/55"
              } ${dim ? "opacity-35" : ""}`}
              style={{ backdropFilter: "blur(6px)" }}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-cyan text-ink" : "bg-white/10 text-white"}`}>
                <Icon slug={s.icon} className="h-3.5 w-3.5" />
              </span>
              <span className={`font-mono text-[11px] whitespace-nowrap text-white/90 ${on ? "inline" : "hidden sm:inline"}`}>{s.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StaticGrid() {
  return (
    <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {skills.map((s) => (
        <li key={s.id} className="glass rounded-2xl p-4">
          <Icon slug={s.icon} className="mb-3 h-6 w-6 text-cyan" />
          <div className="font-semibold">{s.label}</div>
          <div className="mt-1 text-xs text-mute">{s.projects.map(projectTitle).join(" · ")}</div>
        </li>
      ))}
    </ul>
  );
}

export function Skills({ webgl }: { webgl: boolean }) {
  if (!webgl) {
    return (
      <section id="skills" className="relative px-5 py-32 md:px-10">
        <Reveal>
          <SectionLabel index="04">Stack</SectionLabel>
          <h2 className="text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.95] font-semibold tracking-[-0.03em]">
            Tools I <span className="text-gradient">reach for.</span>
          </h2>
        </Reveal>
        <StaticGrid />
      </section>
    );
  }
  return (
    <section id="skills" className="relative h-[200svh]">
      <div className="pointer-events-none sticky top-0 flex h-[100svh] flex-col justify-between px-5 pt-24 pb-10 md:px-10 md:pt-28">
        <Reveal>
          <SectionLabel index="04">Stack</SectionLabel>
          <h2 className="shade max-w-[12ch] text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.95] font-semibold tracking-[-0.03em]">
            Tools I <span className="text-gradient">reach for.</span>
          </h2>
          <p className="shade mt-4 max-w-sm text-soft">Pulled from the repos I&apos;ve actually worked in.</p>
        </Reveal>
        <InfoCard />
      </div>
      <NodeLabels />
      <ul className="sr-only">
        {skills.map((s) => (
          <li key={s.id}>
            {s.label}: {s.projects.map(projectTitle).join(", ")}
          </li>
        ))}
      </ul>
    </section>
  );
}
