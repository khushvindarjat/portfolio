"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { contact, person } from "@/content/data";
import { scrollToId } from "@/lib/scroll";
import { sfx } from "@/lib/sound";
import { Reveal, SectionLabel } from "./Reveal";

const noop = () => () => {};
/** Current year, read on the client only (keeps the page statically prerenderable). */
function Year() {
  return <>{useSyncExternalStore(noop, () => new Date().getFullYear(), () => 2026)}</>;
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(0);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(person.email);
    } catch {
      // Clipboard can be blocked (e.g. insecure context) — fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = person.email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    sfx.click();
    setCopied(true);
    setBurst((b) => b + 1);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="group relative inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.03] py-2 pr-2 pl-5 transition hover:border-white/35"
      data-cursor="copy"
      aria-label={`Copy email address ${person.email}`}
    >
      <span className="font-mono text-sm text-white/90 sm:text-base">{person.email}</span>
      <span className="relative flex h-9 min-w-[5.5rem] items-center justify-center overflow-hidden rounded-full bg-white px-3 font-mono text-[11px] tracking-[0.14em] text-ink uppercase">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? "y" : "n"}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </motion.span>
        </AnimatePresence>
      </span>
      {/* Little spark burst */}
      <AnimatePresence>
        {copied && (
          <motion.span key={burst} className="pointer-events-none absolute top-1/2 right-12" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute h-1 w-1 rounded-full"
                  style={{ background: ["#22e4ff", "#7c5cff", "#ff5cc8"][i % 3] }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * 34, y: Math.sin(a) * 34, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              );
            })}
            <motion.span
              className="absolute -top-6 -left-6 h-12 w-12 rounded-full border border-cyan/60"
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function MailForm() {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Hello from ${name || "your portfolio"}`);
    const body = encodeURIComponent(`${msg}\n\n— ${name}`);
    sfx.click();
    window.location.href = `mailto:${person.email}?subject=${subject}&body=${body}`;
  };
  const field =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/30 transition focus:border-cyan/60 focus:bg-white/[0.05] focus:outline-none";
  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="sr-only" htmlFor="c-name">
        Your name
      </label>
      <input id="c-name" className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <label className="sr-only" htmlFor="c-msg">
        Message
      </label>
      <textarea id="c-msg" className={`${field} min-h-[7.5rem] resize-none`} placeholder="What are we building?" value={msg} onChange={(e) => setMsg(e.target.value)} required />
      <button
        type="submit"
        className="mt-1 rounded-full bg-white px-6 py-3.5 font-mono text-[11px] tracking-[0.16em] text-ink uppercase transition hover:bg-cyan"
        data-cursor="send"
      >
        Send via email →
      </button>
      <p className="font-mono text-[10px] tracking-wider text-white/35">Opens your mail app with the message filled in.</p>
    </form>
  );
}

export function Contact() {
  return (
    <section id="contact" className="relative flex min-h-[100svh] flex-col justify-between px-5 pt-28 pb-8 md:px-10">
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 md:grid-cols-2">
        <Reveal>
          <SectionLabel index="05">Contact</SectionLabel>
          <h2 className="shade text-[clamp(2.4rem,6vw,5.2rem)] leading-[0.92] font-semibold tracking-[-0.035em]">
            {contact.heading.split(" ").slice(0, -1).join(" ")} <span className="text-gradient">{contact.heading.split(" ").slice(-1)}</span>
          </h2>
          <p className="shade mt-6 max-w-md text-lg text-soft">{contact.body}</p>
          <div className="mt-8">
            <CopyEmail />
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {person.socials
              .filter((s) => !s.href.startsWith("mailto"))
              .map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="glass rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-white/80 uppercase transition hover:text-white"
                  data-cursor="open"
                >
                  {s.label} ↗
                </a>
              ))}
            {person.resumeUrl && (
              <a href={person.resumeUrl} target="_blank" rel="noreferrer" className="glass rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-white/80 uppercase transition hover:text-white" data-cursor="open">
                Résumé ↗
              </a>
            )}
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="glass rounded-3xl p-5 md:p-7" style={{ background: "linear-gradient(180deg, rgba(10,12,22,0.6), rgba(8,9,16,0.7))" }}>
            <MailForm />
          </div>
        </Reveal>
      </div>

      <footer className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 font-mono text-[11px] tracking-wider text-white/40 md:flex-row md:items-center md:justify-between">
        <span>
          © <Year /> {person.name} · {person.location}
        </span>
        <span>Next.js · React Three Fiber · custom GLSL</span>
        <button type="button" onClick={() => scrollToId("hero")} className="self-start uppercase transition hover:text-white md:self-auto">
          Back to top ↑
        </button>
      </footer>
    </section>
  );
}
