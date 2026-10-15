// @ts-nocheck
/**
 * Block World photo mode (Legacy, Infinite, Free Style): the HUD steps aside, a slider moves the sun (only the sky and light: the game
 * clock is untouched), filters and a cinema frame, and "Save picture" writes a PNG of what you see.
 */
const FILTERS: Array<[string, string]> = [["Natural", ""], ["Vivid", "saturate(1.45) contrast(1.08)"], ["Golden", "sepia(.3) saturate(1.35) brightness(1.04)"], ["Cinematic", "contrast(1.18) saturate(.85) brightness(.96)"], ["Dreamy", "brightness(1.08) saturate(1.2) blur(.4px)"], ["B & W", "grayscale(1) contrast(1.25)"]];
const PRESETS: Array<[string, number]> = [["🌅 Sunrise", 0.02], ["☀️ Noon", 0.25], ["🌇 Golden hour", 0.462], ["🌆 Sunset", 0.49], ["🌌 Dusk", 0.52], ["🌙 Night", 0.75]];

export interface BlockPhotoOpts {
  host: HTMLElement;              // where the bar goes (and gets the "photo on" class that hides the HUD)
  canvas: HTMLCanvasElement;
  render: () => void;             // draw a frame now (so the canvas can be read)
  dayLength: number;
  now: () => number;              // the game clock (seconds)
  setSky: (t: number | null) => void;   // hold the sky at this time (null = follow the game)
  name: string;
}

export function createBlockPhoto(o: BlockPhotoOpts) {
  const bar = document.createElement("div"); bar.className = "bw-photo-ui";
  o.host.appendChild(bar);
  let open = false, filter = 0, frame = false, cyc = -1, baseFilter = "";
  const clock = (c: number) => { const h = (c * 24 + 6) % 24; return String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.floor((h % 1) * 60)).padStart(2, "0"); };
  function curCyc() { const t = o.now(), D = o.dayLength; return (((t % D) + D) % D) / D; }
  function applySky() { if (!open || cyc < 0) { o.setSky(null); return; } const D = o.dayLength, base = Math.floor(o.now() / D) * D; o.setSky(base + cyc * D); }
  function render() {
    const c = cyc < 0 ? curCyc() : cyc;
    bar.innerHTML = `<div class="bw-pbar"><b>📷 Photo mode</b>` +
      `<label class="bw-ptime">🕒 <input type="range" min="0" max="1000" value="${Math.round(c * 1000)}" data-a="time"><span>${clock(c)}</span></label>` +
      `<div class="bw-prow">${PRESETS.map(([n, v]) => `<button type="button" data-p="${v}">${n}</button>`).join("")}<button type="button" data-p="-1" title="Back to the game's own time">⟲ Live</button></div>` +
      `<div class="bw-prow">${FILTERS.map(([n], i) => `<button type="button" data-f="${i}" class="${i === filter ? "on" : ""}">${n}</button>`).join("")}<button type="button" data-frame="1" class="${frame ? "on" : ""}">▭ Frame</button>` +
      `<button type="button" class="save" data-save="1">💾 Save picture</button><button type="button" data-close="1">✕ Back</button></div></div>` +
      `<div class="bw-letter top"></div><div class="bw-letter bot"></div>`;
    bar.classList.toggle("framed", frame);
  }
  function applyFilter() { o.canvas.style.filter = open && FILTERS[filter]![1] ? (baseFilter + " " + FILTERS[filter]![1]).trim() : baseFilter; }
  const api = {
    get open() { return open; },
    enter() { if (open) return; open = true; baseFilter = o.canvas.style.filter || ""; cyc = -1; o.host.classList.add("bw-photo-on"); bar.classList.add("on"); render(); applyFilter(); },
    exit() { if (!open) return; open = false; o.host.classList.remove("bw-photo-on"); bar.classList.remove("on"); o.canvas.style.filter = baseFilter; o.setSky(null); },
    toggle() { open ? api.exit() : api.enter(); },
    /** call every frame while open: keeps the sky held at the chosen time */
    tick() { if (open) applySky(); },
    save() {
      try {
        o.render();
        const src = o.canvas, W = src.width, H = src.height, out = document.createElement("canvas"); out.width = W; out.height = H;
        const g = out.getContext("2d")!;
        (g as any).filter = (baseFilter + " " + (FILTERS[filter]![1] || "")).trim() || "none"; g.drawImage(src, 0, 0); (g as any).filter = "none";
        if (frame) { const b = Math.round(H * 0.11); g.fillStyle = "#000"; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b); }
        g.font = `600 ${Math.round(H * 0.022)}px system-ui`; g.fillStyle = "rgba(255,255,255,.75)"; g.fillText("Workbench · " + o.name, Math.round(W * 0.02), H - Math.round(H * (frame ? 0.13 : 0.03)));
        const a = document.createElement("a"); a.download = "block-world-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".png"; a.href = out.toDataURL("image/png"); a.click();
      } catch (e) { console.error("photo", e); }
    },
    dispose() { api.exit(); bar.remove(); },
  };
  bar.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLElement; if (!b) return;
    if (b.dataset.p != null) { cyc = +b.dataset.p; applySky(); render(); }
    else if (b.dataset.f) { filter = +b.dataset.f; applyFilter(); render(); }
    else if (b.dataset.frame) { frame = !frame; render(); }
    else if (b.dataset.save) api.save();
    else if (b.dataset.close) api.exit();
  });
  bar.addEventListener("input", (e) => {
    const el = e.target as HTMLInputElement; if (el.dataset.a !== "time") return;
    cyc = +el.value / 1000; applySky(); const s = bar.querySelector(".bw-ptime span"); if (s) s.textContent = clock(cyc);
  });
  return api;
}
