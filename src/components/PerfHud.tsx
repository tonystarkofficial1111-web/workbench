import { useEmitter } from "../core/store";
import { perfEvents, perfState, NAMES } from "../core/perf";

const cls = (f: number) => (f >= 50 ? "g" : f >= 30 ? "a" : "r");

/** On-screen FPS readout + auto-quality note (original #wb-perf-hud / #wb-perf-note). */
export function PerfHud() {
  useEmitter(perfEvents);
  const s = perfState();
  const on = s.running && s.cfg.overlay;
  return (
    <>
      <div id="wb-perf-hud" className={on ? "on" : ""} aria-hidden="true">
        {on && (
          <>
            FPS <b className={cls(s.fps)}>{s.fps}</b> · {s.avgMs.toFixed(1)} ms · {s.heap ? Math.round(s.heap.used) + " MB" : "mem n/a"} · Q: {NAMES[s.level]}
            {s.speed > 1 ? " · " + s.speed + "x" : ""}
          </>
        )}
      </div>
      <div id="wb-perf-note" role="status" style={{ display: s.note ? "block" : "none" }}>{s.note}</div>
    </>
  );
}
