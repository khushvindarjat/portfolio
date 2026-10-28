"use client";

import { motion } from "framer-motion";
import { nav, person } from "@/content/data";
import { setUI, useUI } from "@/lib/store";
import { scrollToId } from "@/lib/scroll";
import { sfx } from "@/lib/sound";

export function Nav() {
  const phase = useUI((s) => s.phase);
  const active = useUI((s) => s.activeSection);
  const sound = useUI((s) => s.sound);
  const show = phase === "ready";

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 md:px-10 md:py-7"
    >
      <a
        href="#hero"
        onClick={(e) => {
          e.preventDefault();
          scrollToId("hero");
        }}
        className="pointer-events-auto flex items-center gap-2.5 font-mono text-[12px] tracking-[0.2em] text-white uppercase"
        aria-label={`${person.name} — back to top`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan/60" />
          <span className="relative h-2 w-2 rounded-full bg-cyan" />
        </span>
        KSC
      </a>

      <nav className="pointer-events-auto hidden items-center gap-1 rounded-full px-1.5 py-1.5 md:flex glass" aria-label="Sections">
        {nav.slice(1).map((n, i) => {
          const isActive = active === i + 1;
          return (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={(e) => {
                e.preventDefault();
                sfx.click();
                scrollToId(n.id);
              }}
              onMouseEnter={() => sfx.hover()}
              className={`relative rounded-full px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors ${
                isActive ? "text-ink" : "text-white/65 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
              )}
              <span className="relative">{n.label}</span>
            </a>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => {
          const next = !sound;
          setUI({ sound: next });
          sfx.setEnabled(next);
          if (next) sfx.click();
        }}
        className="pointer-events-auto flex items-center gap-2.5 font-mono text-[11px] tracking-[0.18em] text-white/70 uppercase transition-colors hover:text-white"
        aria-pressed={sound}
        aria-label={sound ? "Turn sound off" : "Turn sound on"}
        data-cursor={sound ? "mute" : "sound"}
      >
        <span className="flex h-3 items-end gap-[2px]" aria-hidden>
          {[0.5, 1, 0.7, 0.35].map((h, i) => (
            <motion.span
              key={i}
              className="w-[2px] rounded-full bg-current"
              animate={sound ? { height: ["30%", `${h * 100}%`, "40%"] } : { height: "25%" }}
              transition={sound ? { duration: 0.9 + i * 0.15, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            />
          ))}
        </span>
        <span className="hidden sm:inline">Sound {sound ? "on" : "off"}</span>
      </button>
    </motion.header>
  );
}
