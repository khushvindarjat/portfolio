"use client";

import { motion } from "framer-motion";
import { openSource } from "@/content/data";
import { Reveal, SectionLabel } from "./Reveal";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function OpenSource() {
  const merged = openSource.timeline.filter((t) => t.status === "merged").length;
  const repos = new Set(openSource.timeline.map((t) => t.repo)).size;

  return (
    <section id="opensource" className="relative px-5 py-32 md:px-10 md:py-40">
      <div className="max-w-[44rem]">
        <Reveal>
          <SectionLabel index="03">Open source</SectionLabel>
          <h2 className="shade text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.95] font-semibold tracking-[-0.03em]">
            Learning in <span className="text-gradient">public repos.</span>
          </h2>
          <p className="shade mt-6 max-w-lg text-lg text-soft">{openSource.intro}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <a
            href={openSource.achievement.href}
            target="_blank"
            rel="noreferrer"
            className="glass mt-10 inline-flex items-center gap-4 rounded-2xl py-3 pr-5 pl-3 transition hover:border-white/25"
            data-cursor="open"
          >
            <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/25 via-violet/25 to-magenta/25">
              {/* Shark fin glyph */}
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M3 17c2 0 2-1.5 4.5-1.5S10 17 12 17s2.5-1.5 4.5-1.5S19 17 21 17" strokeLinecap="round" />
                <path d="M7 15.5C8 10 11 5.5 16 4c-1 3.5-1 7.5.5 11.5" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              <span className="block font-semibold">{openSource.achievement.name} achievement</span>
              <span className="block text-sm text-mute">{openSource.achievement.detail}</span>
            </span>
          </a>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 flex gap-10 font-mono text-[11px] tracking-[0.14em] text-white/55 uppercase">
            <span>
              <b className="mr-2 text-2xl font-semibold text-white tabular-nums">{merged}</b>merged PRs
            </span>
            <span>
              <b className="mr-2 text-2xl font-semibold text-white tabular-nums">{repos}</b>repositories
            </span>
          </div>
        </Reveal>

        <ol className="relative mt-12 border-l border-white/10 pl-7">
          {openSource.timeline.map((t, i) => (
            <motion.li
              key={t.href + t.title}
              className="group relative pb-7 last:pb-0"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-5% 0px" }}
              transition={{ duration: 0.6, delay: Math.min(i, 6) * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className={`absolute top-[0.45rem] -left-[33px] h-[9px] w-[9px] rounded-full border ${
                  t.status === "merged" ? "border-violet bg-violet/40 shadow-[0_0_12px_#7c5cff]" : "border-cyan bg-cyan/30"
                }`}
              />
              <a href={t.href} target="_blank" rel="noreferrer" className="block" data-cursor="open">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-wider text-white/45">
                  <time dateTime={t.date}>{formatDate(t.date)}</time>
                  <span className="text-white/25">·</span>
                  <span>{t.repo}</span>
                  <span
                    className={`rounded-full px-2 py-[1px] text-[10px] uppercase ${
                      t.status === "merged" ? "bg-violet/15 text-[#b9a9ff]" : "bg-cyan/10 text-cyan"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="shade mt-1 text-lg text-white/90 transition group-hover:text-white">
                  {t.title} <span className="inline-block opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100">↗</span>
                </div>
              </a>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
