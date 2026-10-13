import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { activeTab, arcadeSub, goto } from "../core/nav";
import { useValue } from "../core/store";
import { WORLD_MARKUP } from "../world/markup";
import { initWorld } from "../world/engine";
import { initRecorder } from "../world/recorder";
import { worldUi } from "./ArcadeTab";

/**
 * Block World tab. The markup is handed to the engine as plain DOM (the three.js engine owns it, like the
 * original); React owns the tab container, the mode picker wiring, the back button and the Instructions dialog.
 */
export function WorldTab() {
  const tab = useValue(activeTab);
  const pick = useValue(worldUi.modeSelect);
  const ref = useRef<HTMLElement>(null);
  const [instr, setInstr] = useState<string | null>(null);

  useEffect(() => {
    const root = ref.current!;
    const overlay = () => document.getElementById("mode-select-overlay");
    // Mode picker buttons
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const modeBtn = t.closest("[data-mode]") as HTMLElement | null;
      if (modeBtn && root.contains(modeBtn)) {
        overlay()?.classList.remove("show");
        window.dispatchEvent(new CustomEvent("world:mode-selected", { detail: { mode: modeBtn.dataset.mode } }));
        return;
      }
      if (t.closest("#mode-resume-btn")) { overlay()?.classList.remove("show"); return; }
      if (t.closest("#block-world-back")) {
        overlay()?.classList.remove("show");
        goto("tab-arcade");
        arcadeSub.set("games");
        return;
      }
      if (t.closest("#bw-instr-btn")) {
        const L = document.getElementById("legacy-hud")?.classList.contains("show");
        const h = document.getElementById(L ? "legacy-hint" : "game-hint");
        setInstr(h ? h.textContent || "" : "");
      }
    };
    root.addEventListener("click", onClick);
    // The engine boots once the markup is in the document (module code ran at page load in the original).
    initRecorder();
    initWorld();
    return () => root.removeEventListener("click", onClick);
  }, []);

  // The engine sizes its canvas from this section, which has no size while it is hidden. The original added the
  // "active" class and THEN sent game:resize; here the class is applied by React, so the event has to wait for the commit
  // or the renderer keeps the window's size and the picture comes out squashed (and the world picks the wrong spots).
  useLayoutEffect(() => {
    if (tab !== "tab-world") return;
    window.dispatchEvent(new Event("game:resize"));
    window.dispatchEvent(new Event("world:check-resume"));
  }, [tab]);

  // Arcade "Block World" sub-tab asks for the mode picker.
  useEffect(() => {
    if (pick) {
      document.getElementById("mode-select-overlay")?.classList.add("show");
      worldUi.modeSelect.set(false);
    }
  }, [pick]);

  return (
    <>
      <section id="tab-world" ref={ref} className={"tab" + (tab === "tab-world" ? " active" : "")} dangerouslySetInnerHTML={{ __html: WORLD_MARKUP }} />
      <div id="bw-instr" style={{ display: instr === null ? "none" : "flex" }} onClick={(e) => { if (e.target === e.currentTarget) setInstr(null); }}>
        <div className="c">
          <h3>Instructions</h3>
          <div className="b">{instr}</div>
          <p style={{ textAlign: "right", margin: "12px 0 0" }}><button type="button" className="x" onClick={() => setInstr(null)}>Close</button></p>
        </div>
      </div>
    </>
  );
}
