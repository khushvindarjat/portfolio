"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUI } from "@/lib/store";

/** Black screen, a thin line that fills, and a percentage counter. */
export function Loader({ onDone }: { onDone: () => void }) {
  const progress = useUI((s) => s.progress);
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(true);
  const target = useRef(0);
  const doneRef = useRef(false);
  useEffect(() => {
    target.current = progress;
  }, [progress]);

  useEffect(() => {
    let raf = 0;
    let v = 0;
    const loop = () => {
      // Ease towards the real progress, but never stall at a fake value.
      v += (target.current - v) * 0.12 + (target.current > v ? 0.002 : 0);
      v = Math.min(v, target.current);
      setShown(v);
      if (v >= 0.999 && !doneRef.current) {
        doneRef.current = true;
        setTimeout(() => setVisible(false), 180);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          role="progressbar"
          aria-label="Loading"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(shown * 100)}
        >
          <div className="w-[min(320px,70vw)]">
            <div className="mb-3 flex items-end justify-between font-mono text-[11px] tracking-[0.2em] text-white/50 uppercase">
              <span>Loading</span>
              <span className="tabular-nums text-white/80">{String(Math.round(shown * 100)).padStart(3, "0")}%</span>
            </div>
            <div className="relative h-px w-full overflow-hidden bg-white/10">
              <div
                className="absolute inset-y-0 left-0 origin-left bg-gradient-to-r from-cyan via-violet to-magenta"
                style={{ width: "100%", transform: `scaleX(${shown})` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
