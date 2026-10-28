"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { about } from "@/content/data";
import { Reveal, SectionLabel } from "./Reveal";

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

export function About() {
  return (
    <section id="about" className="relative flex min-h-[120svh] items-center px-5 py-28 md:px-10">
      <div className="w-full max-w-[38rem] pt-[38svh] md:pt-0">
        <Reveal>
          <SectionLabel index="01">About</SectionLabel>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="shade text-[clamp(2.1rem,5vw,4rem)] leading-[0.98] font-semibold tracking-[-0.03em]">
            {about.heading.split(" ").slice(0, -2).join(" ")}{" "}
            <span className="text-gradient">{about.heading.split(" ").slice(-2).join(" ")}</span>
          </h2>
        </Reveal>
        <div className="mt-8 space-y-5">
          {about.paragraphs.map((p, i) => (
            <Reveal key={i} delay={0.1 + i * 0.06}>
              <p className="shade text-[1.05rem] leading-relaxed text-soft md:text-lg">{p}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-line pt-6">
            {about.stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="label mt-2 block !text-[10px] !tracking-[0.12em]">{s.label}</dt>
                <dd className="text-4xl font-semibold tracking-tight md:text-5xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-mono text-[10px] tracking-wider text-white/35">Source: public GitHub activity.</p>
        </Reveal>
      </div>
    </section>
  );
}
