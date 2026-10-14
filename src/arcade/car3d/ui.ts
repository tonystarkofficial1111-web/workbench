// @ts-nocheck
import type { TrackPath } from "../f1/path";

/** Small DOM helpers shared by the 3D car games (HUD text, minimap, banners). */
export function el(tag: string, cls: string, parent?: HTMLElement, html?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e as HTMLElement;
}

/** The course seen from above: drawn once, then the car and markers are put on top every frame. */
export function createMinimap(parent: HTMLElement, path: TrackPath, opts: { w?: number; h?: number; width?: number; color?: string } = {}) {
  const W = opts.w ?? 200, H = opts.h ?? 150;
  const cv = el("canvas", "c3d-mini", parent) as HTMLCanvasElement; cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  const pad = 12, sx = (W - pad * 2) / Math.max(1, path.maxX - path.minX), sz = (H - pad * 2) / Math.max(1, path.maxZ - path.minZ), s = Math.min(sx, sz);
  const ox = (W - (path.maxX - path.minX) * s) / 2 - path.minX * s, oz = (H - (path.maxZ - path.minZ) * s) / 2 - path.minZ * s;
  const P = (x: number, z: number) => [ox + x * s, oz + z * s];
  const base = document.createElement("canvas"); base.width = W; base.height = H;
  const b = base.getContext("2d")!;
  b.lineJoin = "round"; b.lineCap = "round";
  const trace = () => { b.beginPath(); for (let i = 0; i <= path.n; i++) { const k = i % path.n, [x, y] = P(path.px[k]!, path.pz[k]!); i ? b.lineTo(x, y) : b.moveTo(x, y); } };
  trace(); b.strokeStyle = "rgba(0,0,0,.55)"; b.lineWidth = Math.max(5, (opts.width ?? 10) * s + 4); b.stroke();
  trace(); b.strokeStyle = opts.color ?? "rgba(95,212,199,.9)"; b.lineWidth = Math.max(3, (opts.width ?? 10) * s); b.stroke();
  const [sx0, sy0] = P(path.px[0]!, path.pz[0]!); b.fillStyle = "#fff"; b.fillRect(sx0 - 3, sy0 - 3, 6, 6);
  return {
    el: cv,
    draw(dots: Array<{ x: number; z: number; color: string; r?: number; h?: number }>, marks: Array<{ x: number; z: number; color: string }> = []) {
      g.clearRect(0, 0, W, H); g.drawImage(base, 0, 0);
      for (const m of marks) { const [x, y] = P(m.x, m.z); g.fillStyle = m.color; g.fillRect(x - 2.5, y - 2.5, 5, 5); }
      for (const d of dots) {
        const [x, y] = P(d.x, d.z);
        if (d.h !== undefined) {
          g.save(); g.translate(x, y); g.rotate(-d.h); g.fillStyle = d.color; g.beginPath(); g.moveTo(0, 7); g.lineTo(4.5, -4); g.lineTo(-4.5, -4); g.closePath(); g.fill(); g.strokeStyle = "#000"; g.lineWidth = 1; g.stroke(); g.restore();
        } else { g.fillStyle = d.color; g.beginPath(); g.arc(x, y, d.r ?? 3.5, 0, Math.PI * 2); g.fill(); }
      }
    },
  };
}

/** A banner in the middle of the screen that fades after a while. */
export function createBanner(parent: HTMLElement) {
  const b = el("div", "c3d-banner", parent);
  let until = 0;
  return {
    show(html: string, ms = 1400, cls = "") { b.innerHTML = html; b.className = "c3d-banner on " + cls; until = performance.now() + ms; },
    tick(now: number) { if (until && now > until) { b.classList.remove("on"); until = 0; } },
    hide() { b.classList.remove("on"); until = 0; },
  };
}

export const fmtTime = (s: number) => { const m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + r.toFixed(2); };
