// @ts-nocheck
import { createStage, loadLevel, setEnvironment } from "../car3d/stage";
import { el } from "../car3d/ui";
import { createWorkshop, type Step } from "./workshop";
import { createHill } from "./hill";

declare const __WB_DBG__: boolean;

/**
 * The 3D side of Take Your Time (the 9,000-point Build, Climb & Race challenge in the Car Garage). The game itself (timing checks, scores,
 * stages) stays in the generated legacy029 module; it calls this to show each assembly step as a ~10 s fast-forward clip, and to drive the
 * hill in 3D for the uphill and downhill stages.
 */
export function createThinkers3D(host: HTMLElement) {
  host.innerHTML = "";
  const root = el("div", "c3d-root ct3", host);
  const view = el("div", "c3d-view", root);
  const stage = createStage(view, loadLevel());
  const T = stage.THREE, scene = stage.scene, camera = stage.camera;
  stage.renderer.toneMappingExposure = 1.1;
  let envTex = setEnvironment(stage, "room");
  const badge = el("div", "ct3-badge", root), cap = el("div", "ct3-cap", root), bar = el("div", "ct3-bar", root), barFill = el("i", "", bar);
  const skip = el("button", "ct3-skip", root, "Skip ▶▶") as HTMLButtonElement; skip.type = "button";
  let workshop: any = createWorkshop(T, scene, stage.f), hill: any = null;
  let mode: "shop" | "hill" = "shop";
  skip.onclick = () => { if (workshop && workshop.playing) workshop.skip(); };
  stage.onFrame((dt) => {
    if (mode === "shop" && workshop) {
      workshop.update(dt, camera);
      const on = workshop.playing;
      badge.style.display = on ? "" : "none"; skip.style.display = on ? "" : "none"; bar.style.display = on ? "" : "none";
      if (on) {
        badge.innerHTML = `▶▶ <b>6×</b> <span>${fmt(workshop.clipTime * 6)}</span>`;
        cap.textContent = workshop.caption(); cap.className = "ct3-cap on" + (/^MISSED/.test(cap.textContent) ? " bad" : "");
        barFill.style.width = Math.min(100, (workshop.clipTime / workshop.clipDur) * 100) + "%";
      }
    } else if (hill) {
      hill.update(dt, camera);
      badge.style.display = "none"; skip.style.display = "none"; bar.style.display = "none";
    }
  });
  const fmt = (s: number) => { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ":" + (r < 10 ? "0" : "") + r; };
  let disposed = false;
  const api = {
    ready(step: Step, label?: string) { if (mode !== "shop" || !workshop) return; workshop.ready(step); cap.textContent = label || ""; cap.className = label ? "ct3-cap on" : "ct3-cap"; },
    play(step: Step, ok: boolean, after: () => void) {
      if (!workshop) { after(); return; }
      workshop.play(step, ok, () => { cap.className = "ct3-cap on" + (ok ? " good" : " bad"); cap.textContent = ok ? "Assembled · +750" : "Assembled anyway · 0 points"; setTimeout(after, 500); });
    },
    drive(down: boolean, idx: number, count: number, gear: number) {
      if (mode !== "hill") {
        mode = "hill";
        if (workshop) { workshop.dispose(); workshop = null; }
        scene.children.slice().forEach((o: any) => { if (o.isLight) scene.remove(o); });
        hill = createHill(T, scene, stage.f);
        envTex.dispose(); envTex = setEnvironment(stage, "sky", ["#3f78c8", "#8fbde8", "#4f7a34"]);
      }
      if (idx === 0) hill.start(down);
      hill.gear(gear);
      cap.className = "ct3-cap on"; cap.textContent = (down ? "Downhill race against the AI" : "Hill climb") + " · shift " + (idx + 1) + " of " + count;
    },
    shift(ok: boolean) { if (hill) hill.shift(ok); },
    finish() { if (hill) { hill.finish(); cap.className = "ct3-cap on good"; cap.textContent = "Challenge complete"; } },
    dispose() {
      if (disposed) return; disposed = true;
      workshop && workshop.dispose(); hill && hill.dispose(); stage.dispose(); host.innerHTML = "";
      if (typeof __WB_DBG__ !== "undefined" && __WB_DBG__ && (window as any).__ct3 === api) (window as any).__ct3 = null;
    },
    get workshop() { return workshop; }, stage,
  };
  stage.onDispose(() => api.dispose());
  if (typeof __WB_DBG__ !== "undefined" && __WB_DBG__) (window as any).__ct3 = api;
  return api;
}
