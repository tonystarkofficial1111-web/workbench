import { useEffect, type ReactNode } from "react";
import { Value, useValue } from "./store";

/**
 * The single shared full-window overlay (#ac-overlay) used by every lab and arcade game.
 * It is mounted at the document root so it can open from any tab (original 5.40.5 fix).
 */
const content = new Value<{ id: number; node: ReactNode } | null>(null);
/** True while an imperative engine game (cabinet) owns the overlay element. */
const engine = new Value(false);
let counter = 0;

/** Open an imperative engine game: the overlay is shown and the engine fills it itself. */
export function openEngine(launch: () => void) {
  engine.set(true);
  const ov = document.getElementById("ac-overlay");
  if (ov) ov.classList.add("on");
  launch();
}
/** Called by engines when they close and clear the overlay. */
export function engineClosed() {
  engine.set(false);
}

export const overlayOpen = () => content.get() !== null || engine.get();

export function openOverlay(node: ReactNode) {
  try {
    const ov = document.getElementById("ac-overlay");
    if (ov && ov.requestFullscreen) ov.requestFullscreen().catch(() => {});
  } catch { /* ignore */ }
  content.set({ id: ++counter, node });
}
export function closeOverlay() {
  content.set(null);
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch { /* ignore */ }
}

export function OverlayHost() {
  const c = useValue(content);
  const eng = useValue(engine);
  return (
    <div id="ac-overlay" className={c || eng ? "on" : ""}>
      {c ? <div key={c.id} style={{ display: "contents" }}>{c.node}</div> : null}
    </div>
  );
}

/** Shell used by the Educational labs and the 5.19-style games (original ovOpen). */
export function G519Shell({
  title, sub, className, children, onClose, footer,
}: {
  title: ReactNode;
  sub?: string;
  className?: string;
  children: ReactNode;
  onClose?: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => () => { onClose?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={"g519-shell" + (className ? " " + className : "")}>
      <h3>{title}</h3>
      {sub ? <p className="g519-sub">{sub}</p> : null}
      {children}
      {footer}
      <div className="g519-foot">
        <button className="type-btn ghost" id="g519-close" onClick={() => closeOverlay()}>Close</button>
      </div>
    </div>
  );
}
