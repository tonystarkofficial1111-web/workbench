import { Emitter, lsGetRaw, lsSetRaw } from "./store";

/** Web Audio beeps (original WB_SOUND). Mute flag persists in localStorage 'wb-muted'. */
let ctx: AudioContext | null = null;
let muted = lsGetRaw("wb-muted") === "1";
export const soundEvents = new Emitter();

function ensure(): AudioContext | null {
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq || 440;
    g.gain.value = gain || 0.06;
    o.connect(g);
    g.connect(c.destination);
    const t = c.currentTime;
    g.gain.setValueAtTime(gain || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
    o.start(t);
    o.stop(t + (dur || 0.12));
  } catch {
    /* ignore */
  }
}

export const WB_SOUND = {
  isMuted: () => muted,
  toggle() {
    muted = !muted;
    lsSetRaw("wb-muted", muted ? "1" : "0");
    if (!muted) beep(660, 0.1, "square", 0.05);
    soundEvents.emit();
    return muted;
  },
  click: () => beep(420, 0.06, "square", 0.04),
  hover: () => beep(520, 0.04, "sine", 0.025),
  launch() {
    beep(300, 0.08, "sawtooth", 0.05);
    setTimeout(() => beep(500, 0.08, "sawtooth", 0.05), 70);
  },
  coin() {
    beep(880, 0.07, "square", 0.05);
    setTimeout(() => beep(1100, 0.07, "square", 0.05), 70);
  },
  win() {
    beep(660, 0.1, "square", 0.05);
    setTimeout(() => beep(880, 0.1, "square", 0.05), 100);
    setTimeout(() => beep(1100, 0.16, "square", 0.05), 210);
  },
};
