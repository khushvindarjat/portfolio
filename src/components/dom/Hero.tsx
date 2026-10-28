"use client";

import { motion, useReducedMotion } from "framer-motion";
import { person } from "@/content/data";
import { useUI } from "@/lib/store";
import { scrollToId } from "@/lib/scroll";

const ease = [0.16, 1, 0.3, 1] as const;

function SettleText({ text, delay, show, className }: { text: string; delay: number; show: boolean; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span className={`block ${className ?? ""}`} aria-hidden>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          className="mr-[0.22em] inline-block last:mr-0"
          initial={reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(16px)", letterSpacing: "0.32em" }}
          animate={show ? { opacity: 1, filter: "blur(0px)", letterSpacing: "-0.035em" } : undefined}
          transition={{ duration: reduced ? 0.4 : 1.05, delay: delay + i * 0.08, ease }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function Hero() {
  const phase = useUI((s) => s.phase);
  const show = phase === "ready";

  return (
    <section id="hero" className="relative flex min-h-[100svh] flex-col justify-end px-5 pt-28 pb-10 md:px-10 md:pb-12">
      <div className="grid items-end gap-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <motion.div
            className="label mb-5 flex items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={show ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, ease }}
          >
            <span className="h-px w-8 bg-gradient-to-r from-cyan to-violet" />
            {person.role}
          </motion.div>
          <h1 className="shade font-display text-[clamp(2.9rem,10.5vw,10rem)] leading-[0.86] font-semibold text-white">
            <span className="sr-only">{person.name}</span>
            <SettleText text={person.firstName} delay={0.05} show={show} />
            <SettleText text={person.lastName} delay={0.16} show={show} className="text-white/90" />
          </h1>
        </div>

        <motion.div
          className="flex flex-col gap-6 md:col-span-4 md:items-end md:pb-3 md:text-right"
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={show ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
          transition={{ duration: 0.9, delay: 0.45, ease }}
        >
          <p className="shade max-w-[22rem] text-lg leading-snug text-soft md:text-xl">{person.tagline}</p>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {person.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="glass rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-white/80 uppercase transition-colors hover:border-white/30 hover:text-white"
                data-cursor="open"
              >
                {s.label} ↗
              </a>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.button
        type="button"
        onClick={() => scrollToId("about")}
        className="label mt-10 flex items-center gap-3 self-start md:mt-14"
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 1 } : undefined}
        transition={{ duration: 0.8, delay: 0.8 }}
        aria-label="Scroll to About"
      >
        <span className="relative block h-9 w-[1px] overflow-hidden bg-white/15">
          <motion.span
            className="absolute inset-x-0 top-0 h-1/2 bg-white"
            animate={{ y: ["-100%", "200%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
        Scroll to explore · hold to pull
      </motion.button>
    </section>
  );
}
