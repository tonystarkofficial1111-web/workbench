import { useEffect, useRef } from "react";
import { Value, useValue, lsGetRaw, lsSetRaw } from "../core/store";
import { activeTab } from "../core/nav";

/**
 * Live background (5.67.0): a quiet animated layer behind every page, in the theme's own colours (the accent and the page
 * background): a few large soft glows drifting slowly, fine dust that floats up, and a faint grid that breathes. Pages also fade and
 * rise in when you change tabs (CSS). It stops while a game fills the screen, when the window is hidden, and for people who asked their
 * system for reduced motion; it can be turned off in User / Saves (or from Quick search).
 */
export const liveBg = new Value<boolean>(lsGetRaw("wb-live-bg") !== "0");
liveBg.subscribe(() => { lsSetRaw("wb-live-bg", liveBg.get() ? "1" : "0"); });

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function rgbOf(c: string): [number, number, number] {
  const el = document.createElement("i"); el.style.color = c; document.body.appendChild(el);
  const m = getComputedStyle(el).color.match(/\d+/g); el.remove();
  return m ? [+m[0]!, +m[1]!, +m[2]!] : [224, 164, 88];
}

export function LiveBackground() {
  const on = useValue(liveBg);
  const tab = useValue(activeTab);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { document.body.classList.toggle("wb-live-bg", on); }, [on]);
  useEffect(() => {
    if (!on) return;
    const cv = ref.current!; const g = cv.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = performance.now(), t = Math.random() * 100, colorT = 0;
    let accent: [number, number, number] = [224, 164, 88], second: [number, number, number] = [105, 215, 208];
    const readColors = () => { accent = rgbOf(cssColor("--amber", "#e0a458")); second = rgbOf(cssColor("--teal", cssColor("--blue", "#69d7d0"))); };
    readColors();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const resize = () => { cv.width = Math.floor(innerWidth * dpr * 0.5); cv.height = Math.floor(innerHeight * dpr * 0.5); };
    resize(); addEventListener("resize", resize);
    const blobs = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 0.22 + Math.random() * 0.2, sx: (Math.random() - 0.5) * 0.012, sy: (Math.random() - 0.5) * 0.01, c: i % 2, p: Math.random() * 6 }));
    const dust = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), v: 0.004 + Math.random() * 0.01, s: 0.6 + Math.random() * 1.6, p: Math.random() * 6 }));
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      // a game or the Block World covers the page: nothing to show, save the work
      const covered = activeTab.get() === "tab-world" || !!document.getElementById("ac-overlay")?.classList.contains("on") || document.hidden;
      if (covered) return;
      t += reduced ? 0 : dt;
      colorT += dt; if (colorT > 2) { colorT = 0; readColors(); }
      const W = cv.width, H = cv.height;
      g.clearRect(0, 0, W, H);
      // drifting glows
      g.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const x = ((b.x + Math.sin(t * 0.05 + b.p) * 0.12 + b.sx * t) % 1.3 + 1.3) % 1.3 - 0.15, y = ((b.y + Math.cos(t * 0.04 + b.p) * 0.1 + b.sy * t) % 1.3 + 1.3) % 1.3 - 0.15;
        const [r, gg, bb] = b.c ? second : accent, rad = b.r * Math.max(W, H) * (1 + 0.08 * Math.sin(t * 0.3 + b.p));
        const gr = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, rad);
        gr.addColorStop(0, `rgba(${r},${gg},${bb},0.07)`); gr.addColorStop(0.5, `rgba(${r},${gg},${bb},0.03)`); gr.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      // floating dust
      for (const d of dust) {
        d.y -= d.v * dt; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        const a = 0.18 + 0.18 * Math.sin(t * 1.3 + d.p);
        g.fillStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},${a})`;
        g.fillRect((d.x + Math.sin(t * 0.2 + d.p) * 0.01) * W, d.y * H, d.s * dpr, d.s * dpr);
      }
      // a faint grid that breathes
      g.globalCompositeOperation = "source-over";
      const step = 46 * dpr * 0.5, ga = 0.025 + 0.015 * Math.sin(t * 0.25);
      g.strokeStyle = `rgba(255,255,255,${ga})`; g.lineWidth = 1;
      g.beginPath();
      const off = (t * 4) % step;
      for (let x = -off; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = -off; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); g.clearRect(0, 0, cv.width, cv.height); };
  }, [on]);
  return <canvas ref={ref} id="wb-live-bg" aria-hidden="true" style={{ display: on && tab !== "tab-world" ? "block" : "none" }} />;
}
