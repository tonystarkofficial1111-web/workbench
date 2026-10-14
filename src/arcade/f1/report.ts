/**
 * The disqualification report: everything the driver had at the moment of the crash (impact, race, tyres, systems, the car), over a dimmed picture.
 * It is plain DOM (inline styles) appended to the game's overlay, so it works with or without the 3D feed.
 */
export interface F1ReportSection { title: string; rows: Array<[string, string]> }
export interface F1Report {
  scene?: string;
  sceneSub?: string;
  cause: string;
  sections: F1ReportSection[];
}

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export function hideF1Report() {
  const e = document.getElementById("f1-report");
  if (e && e.parentNode) e.parentNode.removeChild(e);
}

export function showF1Report(host: HTMLElement | null, r: F1Report, hooks: { onRestart(): void }) {
  hideF1Report();
  if (!host) return;
  const box = document.createElement("div");
  box.id = "f1-report";
  box.style.cssText = "position:absolute;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;background:rgba(2,4,8,.58);backdrop-filter:blur(3px);opacity:0;transition:opacity .6s ease;overflow:auto;";
  const sec = r.sections.map((s) =>
    `<div style="min-width:0"><div style="font:800 10px Inter,Arial,sans-serif;letter-spacing:.16em;color:#ff6b5e;margin:0 0 6px">${esc(s.title.toUpperCase())}</div>` +
    s.rows.map((row) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.07);font:600 12px Inter,Arial,sans-serif"><span style="color:#8fa0b2">${esc(row[0])}</span><b style="color:#f2f6fa;text-align:right">${esc(row[1])}</b></div>`).join("") + "</div>").join("");
  box.innerHTML =
    `<div style="width:min(920px,96vw);max-height:calc(100vh - 28px);overflow:auto;border:1px solid rgba(255,70,60,.55);border-radius:14px;background:rgba(9,13,20,.95);box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 40px rgba(255,40,30,.18);padding:20px 22px 18px">` +
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:4px"><span style="background:#c01010;color:#fff;font:900 15px Inter,Arial,sans-serif;letter-spacing:.12em;padding:6px 12px;border-radius:6px">DISQUALIFIED</span>` +
    (r.scene ? `<span style="font:900 22px 'Space Grotesk',Inter,Arial,sans-serif;color:#fff">${esc(r.scene)}</span><span style="font:600 12px Inter,Arial,sans-serif;color:#ffb52e">${esc(r.sceneSub || "")}</span>` : "") +
    `</div><div style="font:600 13px Inter,Arial,sans-serif;color:#cfd8e2;margin:6px 0 14px">${esc(r.cause)}</div>` +
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px 22px">${sec}</div>` +
    `<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button id="f1-report-close" type="button" style="background:transparent;color:#cfd8e2;border:1px solid rgba(255,255,255,.25);border-radius:7px;padding:9px 16px;font:700 11px Inter,Arial,sans-serif;letter-spacing:.08em;cursor:pointer">HIDE REPORT</button>` +
    `<button id="f1-report-restart" type="button" style="background:#ffb52e;color:#140c00;border:0;border-radius:7px;padding:9px 18px;font:800 11px Inter,Arial,sans-serif;letter-spacing:.08em;cursor:pointer">RESTART RACE</button></div></div>`;
  host.appendChild(box);
  requestAnimationFrame(() => { box.style.opacity = "1"; });
  const stop = (e: Event) => e.stopPropagation();
  box.addEventListener("keydown", stop);
  (box.querySelector("#f1-report-restart") as HTMLElement).addEventListener("click", () => { hideF1Report(); hooks.onRestart(); });
  (box.querySelector("#f1-report-close") as HTMLElement).addEventListener("click", () => { box.style.opacity = "0"; box.style.pointerEvents = "none"; });
}
