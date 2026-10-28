"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

/** Fade/blur-up on enter. Used for most UI text blocks. */
export function Reveal({ delay = 0, y = 24, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="label mb-6 flex items-center gap-3">
      <span className="text-cyan/90">{index}</span>
      <span className="h-px w-8 bg-white/20" />
      <span>{children}</span>
    </div>
  );
}
