"use client";

/* ──────────────────────────────────────────────────────────────
 * Tiny synthesized sound kit (Web Audio, no audio files).
 * Off by default; toggled from the UI.
 * ────────────────────────────────────────────────────────────── */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let hum: { stop: () => void } | null = null;
let enabled = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return ctx;
}

function startHum() {
  const ac = ensure();
  const out = ac.createGain();
  out.gain.value = 0.0;
  out.connect(master!);

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.7;
  filter.connect(out);

  const oscs = [55, 82.4, 110.2].map((f, i) => {
    const o = ac.createOscillator();
    o.type = i === 2 ? "triangle" : "sine";
    o.frequency.value = f;
    o.detune.value = (i - 1) * 6;
    const g = ac.createGain();
    g.gain.value = [0.5, 0.25, 0.08][i];
    o.connect(g).connect(filter);
    o.start();
    return o;
  });

  // Slow movement in the filter so the hum "breathes".
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 160;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  out.gain.linearRampToValueAtTime(0.16, ac.currentTime + 2.5);
  return {
    stop() {
      const t = ac.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
        out.disconnect();
      }, 700);
    },
  };
}

function blip(freq: number, dur: number, vol: number, type: OscillatorType = "sine") {
  if (!enabled || !ctx || !master) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  setEnabled(on: boolean) {
    enabled = on;
    const ac = ensure();
    if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime;
    master!.gain.cancelScheduledValues(t);
    master!.gain.setValueAtTime(master!.gain.value, t);
    master!.gain.linearRampToValueAtTime(on ? 1 : 0, t + 0.4);
    if (on && !hum) hum = startHum();
    if (!on && hum) {
      hum.stop();
      hum = null;
    }
  },
  click() {
    blip(880, 0.08, 0.08);
  },
  hover() {
    blip(1320, 0.04, 0.025, "triangle");
  },
  whoosh() {
    blip(220, 0.35, 0.05, "sine");
  },
};
