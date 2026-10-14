/**
 * Generated sound for the car games (no audio files): an engine whose pitch follows the revs (a V8 burble or a six-cylinder howl), tyre squeal
 * from filtered noise when the tyres slide, gravel / dirt rumble, pops on lift-off, and a thump for impacts. Muted with the app's sound switch.
 */
import { WB_SOUND } from "../../core/sound";
const isMuted = () => WB_SOUND.isMuted();

export function createCarAudio(kind: "v8" | "i6" | "rally") {
  let ctx: AudioContext | null = null;
  try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { ctx = null; }
  if (!ctx) return { update() {}, impact() {}, pop() {}, dispose() {}, resume() {} };
  const C = ctx;
  const out = C.createGain(); out.gain.value = isMuted() ? 0 : 0.5; out.connect(C.destination);
  // engine: two detuned saws and a square an octave down, through a soft clipper and a low-pass that opens with the throttle
  const eng = C.createGain(); eng.gain.value = 0;
  const lp = C.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 3;
  const shaper = C.createWaveShaper();
  const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.4); }
  shaper.curve = curve;
  const o1 = C.createOscillator(), o2 = C.createOscillator(), o3 = C.createOscillator();
  o1.type = "sawtooth"; o2.type = "sawtooth"; o3.type = "square";
  const g1 = C.createGain(), g2 = C.createGain(), g3 = C.createGain();
  g1.gain.value = 0.35; g2.gain.value = 0.25; g3.gain.value = kind === "v8" ? 0.4 : 0.18;
  o1.connect(g1).connect(shaper); o2.connect(g2).connect(shaper); o3.connect(g3).connect(shaper);
  shaper.connect(lp).connect(eng).connect(out);
  // noise for the tyres and the ground
  const nb = C.createBuffer(1, C.sampleRate * 1.5, C.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = C.createBufferSource(); noise.buffer = nb; noise.loop = true;
  const sq = C.createBiquadFilter(); sq.type = "bandpass"; sq.frequency.value = 1150; sq.Q.value = 5;
  const sqG = C.createGain(); sqG.gain.value = 0;
  const rum = C.createBiquadFilter(); rum.type = "lowpass"; rum.frequency.value = 260;
  const rumG = C.createGain(); rumG.gain.value = 0;
  noise.connect(sq).connect(sqG).connect(out);
  noise.connect(rum).connect(rumG).connect(out);
  const t0 = C.currentTime;
  o1.start(t0); o2.start(t0); o3.start(t0); noise.start(t0);
  const firing = kind === "v8" ? 4 : 3;   // firings per revolution: V8 = 4, six = 3
  let lastThr = 0;
  return {
    resume() { if (C.state === "suspended") C.resume().catch(() => {}); },
    /** rpm, throttle 0..1, tyre slide 0..1, ground roughness 0..1 */
    update(rpm: number, thr: number, slide: number, rough: number) {
      const t = C.currentTime, f = Math.max(25, (rpm / 60) * firing);
      out.gain.setTargetAtTime(isMuted() ? 0 : 0.5, t, 0.05);
      o1.frequency.setTargetAtTime(f, t, 0.03); o2.frequency.setTargetAtTime(f * 1.012, t, 0.03); o3.frequency.setTargetAtTime(f * 0.5, t, 0.03);
      lp.frequency.setTargetAtTime(500 + thr * 2200 + rpm * 0.15, t, 0.05);
      eng.gain.setTargetAtTime(0.1 + thr * 0.18, t, 0.05);
      sqG.gain.setTargetAtTime(Math.min(0.32, slide * 0.4) * (kind === "rally" ? 0.4 : 1), t, 0.06);
      sq.frequency.setTargetAtTime(950 + slide * 500, t, 0.1);
      rumG.gain.setTargetAtTime(rough * 0.5, t, 0.08);
      if (lastThr > 0.6 && thr < 0.1 && rpm > 4500) this.pop();
      lastThr = thr;
    },
    pop() {
      const t = C.currentTime;
      for (let k = 0; k < 3; k++) {
        const s = C.createBufferSource(); s.buffer = nb; const g = C.createGain(); const bp = C.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 700;
        g.gain.setValueAtTime(0.0001, t + k * 0.07); g.gain.exponentialRampToValueAtTime(0.5, t + k * 0.07 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.07 + 0.06);
        s.connect(bp).connect(g).connect(out); s.start(t + k * 0.07, Math.random()); s.stop(t + k * 0.07 + 0.08);
      }
    },
    /** a hit: 0..1 strength */
    impact(k: number) {
      const t = C.currentTime;
      const o = C.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 + k * 0.6, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
      const s = C.createBufferSource(); s.buffer = nb; const sg = C.createGain(); const hp = C.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
      sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.2 + k * 0.4, t + 0.005); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      s.connect(hp).connect(sg).connect(out); s.start(t, Math.random()); s.stop(t + 0.3);
    },
    dispose() {
      try { o1.stop(); o2.stop(); o3.stop(); noise.stop(); } catch { /* ignore */ }
      C.close().catch(() => {});
    },
  };
}
export type CarAudio = ReturnType<typeof createCarAudio>;
