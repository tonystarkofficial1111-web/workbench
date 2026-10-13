import { useEffect, useRef } from "react";

/** Wandering glowing "snake" lines over a dev-tools grid behind the Start tab (original 5.42.2 canvas). */
type Snake = { path: number[][]; dir: number; acc: number; fade: number; dying?: boolean };

export function TrailBackground({ tabRef }: { tabRef: React.RefObject<HTMLElement | null> }) {
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = cvRef.current;
    const tab = tabRef.current;
    if (!cv || !tab) return;
    const ctx = cv.getContext("2d")!;
    const CELL = 36, TRAIL = 46, STEP = 95, N = 4;
    let W = 0, H = 0, cols = 0, rows = 0, dpr = 1;
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    let snakes: Snake[] = [];

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = tab!.clientWidth;
      H = tab!.clientHeight;
      if (!W || !H) return;
      cv!.width = W * dpr;
      cv!.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / CELL);
      rows = Math.ceil(H / CELL);
    }
    function spawn(): Snake {
      const x = Math.floor(Math.random() * cols), y = Math.floor(Math.random() * rows);
      return { path: [[x, y]], dir: Math.floor(Math.random() * 4), acc: Math.random() * STEP, fade: 0 };
    }
    const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;
    function advance(sn: Snake) {
      const h = sn.path[sn.path.length - 1]!;
      const d = sn.dir;
      let cand: [number, number][] = [[d, 0.55], [(d + 1) % 4, 0.225], [(d + 3) % 4, 0.225]];
      cand = cand.filter((c) => {
        const v = DIRS[c[0]]!;
        return inb(h[0]! + v[0]!, h[1]! + v[1]!);
      });
      if (!cand.length) { sn.dying = true; return; }
      const tot = cand.reduce((a, c) => a + c[1], 0);
      let r = Math.random() * tot, pick = cand[0]![0];
      for (let i = 0; i < cand.length; i++) {
        r -= cand[i]![1];
        if (r <= 0) { pick = cand[i]![0]; break; }
      }
      sn.dir = pick;
      const v = DIRS[pick]!;
      sn.path.push([h[0]! + v[0]!, h[1]! + v[1]!]);
      if (sn.path.length > TRAIL) sn.path.shift();
    }
    function init() {
      size();
      snakes = [];
      for (let i = 0; i < N; i++) snakes.push(spawn());
    }
    let last = performance.now();
    let raf = 0;
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(now - last, 100);
      last = now;
      if (!tab!.offsetParent || document.hidden) return;
      if (tab!.clientWidth !== W || tab!.clientHeight !== H || !cols) init();
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(120,170,255,.045)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx <= W; gx += CELL) { ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); }
      for (let gy = 0; gy <= H; gy += CELL) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); }
      ctx.stroke();
      const pulse = 0.65 + 0.35 * Math.sin(now / 650);
      for (let si = 0; si < snakes.length; si++) {
        const sn = snakes[si]!;
        sn.acc += dt;
        while (sn.acc >= STEP) {
          sn.acc -= STEP;
          if (!sn.dying) advance(sn);
          else sn.path.shift();
        }
        if (sn.path.length < 2 && sn.dying) { snakes[si] = spawn(); continue; }
        const p = sn.path, n = p.length, t = sn.dying ? 0 : sn.acc / STEP;
        for (let i = 0; i < n; i++) {
          const k = Math.pow((i + 1) / n, 1.7);
          const cx = p[i]![0]! * CELL, cy = p[i]![1]! * CELL;
          ctx.fillStyle = "rgba(47,139,255," + (0.2 * k * pulse).toFixed(3) + ")";
          ctx.fillRect(cx + 1, cy + 1, CELL - 1, CELL - 1);
          ctx.strokeStyle = "rgba(90,170,255," + (0.55 * k * pulse).toFixed(3) + ")";
          ctx.strokeRect(cx + 1.5, cy + 1.5, CELL - 2, CELL - 2);
        }
        const pts = p.map((c) => [c[0]! * CELL + CELL / 2, c[1]! * CELL + CELL / 2]);
        if (!sn.dying && n >= 1) {
          const hd = pts[n - 1]!, v = DIRS[sn.dir]!;
          pts.push([hd[0]! + v[0]! * CELL * t, hd[1]! + v[1]! * CELL * t]);
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let j = 1; j < pts.length; j++) {
          const kk = Math.pow(j / pts.length, 1.5);
          const a = pts[j - 1]!, b = pts[j]!;
          ctx.beginPath();
          ctx.moveTo(a[0]!, a[1]!);
          if (j < pts.length - 1) {
            const c = pts[j + 1]!, mx = (b[0]! + c[0]!) / 2, my = (b[1]! + c[1]!) / 2;
            const sx = (a[0]! + b[0]!) / 2, sy = (a[1]! + b[1]!) / 2;
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(b[0]!, b[1]!, mx, my);
          } else ctx.lineTo(b[0]!, b[1]!);
          ctx.shadowColor = "rgba(40,140,255," + (0.95 * pulse).toFixed(3) + ")";
          ctx.shadowBlur = (8 + 16 * pulse) * kk + 2;
          ctx.strokeStyle = "rgba(95,185,255," + (0.15 + 0.85 * kk).toFixed(3) + ")";
          ctx.lineWidth = 1.5 + 2 * kk;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
    }
    const ro = window.ResizeObserver ? new ResizeObserver(() => { cols = 0; }) : null;
    ro?.observe(tab);
    init();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [tabRef]);

  return <canvas id="wb-trail-bg" ref={cvRef} aria-hidden="true"></canvas>;
}
