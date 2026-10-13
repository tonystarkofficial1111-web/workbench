import { useEffect, useRef, useState } from "react";
import { useEmitter } from "../core/store";
import { APP_VERSION } from "../version";
import { ssEvents, ssView, startScreensaver, wbScreensaver, type ClipName } from "../core/screensaver";

const DELAYS: [number, string][] = [[1, "1 minute"], [2, "2 minutes"], [5, "5 minutes"], [10, "10 minutes"], [20, "20 minutes"], [30, "30 minutes"], [60, "60 minutes"]];

export function VersionBadge() {
  useEmitter(ssEvents);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<ClipName | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    startScreensaver();
    const onDoc = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setOpen(false);
        disarm();
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function disarm() {
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = null;
    setArmed(null);
  }

  // Start/stop video playback with the overlay.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (ssView.active) {
      v.currentTime = 0;
      const p = v.play();
      if (p) p.catch(() => {});
    } else v.pause();
  }, [ssView.active, ssView.clipSrc]);

  const clipBtn = (name: ClipName, title: string, sub: string) => {
    const selected = wbScreensaver.getClip() === name;
    const isArmed = armed === name;
    return (
      <button
        type="button"
        className={"ss-clip" + (selected ? " selected" : "") + (isArmed ? " armed" : "")}
        data-clip={name}
        aria-pressed={selected}
        onClick={(e) => {
          e.stopPropagation();
          if (wbScreensaver.getClip() !== name) {
            disarm();
            wbScreensaver.setClip(name); // click 1: select
            return;
          }
          if (isArmed) {
            // click 3: play now, skipping the timer
            disarm();
            setOpen(false);
            wbScreensaver.preview();
            return;
          }
          disarm(); // click 2: ask
          setArmed(name);
          armTimer.current = setTimeout(disarm, 6000);
        }}
      >
        <span>{isArmed ? "Play Screensaver?" : title}</span>
        <em>{isArmed ? "click to confirm" : sub}</em>
      </button>
    );
  };

  return (
    <>
      <div
        id="version-badge"
        ref={badgeRef}
        className={open ? "menu-open" : ""}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls="screensaver-menu"
        title="Workbench controls"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("#screensaver-menu")) return;
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
          if (e.key === "Escape") setOpen(false);
        }}
      >
        St<span className="vb-cursive-a">a</span>rk Enterprises presents:
        <br />
        <span className="vb-line2">
          Workbench <span id="version-badge-number">{APP_VERSION}</span>
        </span>
        <div id="screensaver-menu" aria-hidden={!open}>
          <div className="ss-menu-title">Workbench Screensaver</div>
          <label className="ss-row">
            <span>Enable screensaver</span>
            <input id="ss-enabled" type="checkbox" checked={wbScreensaver.isEnabled()} onChange={(e) => wbScreensaver.setEnabled(e.target.checked)} />
          </label>
          <label className="ss-row">
            <span>Activate after</span>
            <select id="ss-delay" value={String(wbScreensaver.delayMin())} onChange={(e) => wbScreensaver.setDelay(e.target.value)}>
              {DELAYS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <div className="ss-clip-wrap">
            <div className="ss-clip-label">Screensaver clip</div>
            <div className="ss-clip-row">
              {clipBtn("gtd", "Mustang GTD", "720p · reduced size")}
              {clipBtn("x", "X testing", "360p · reduced size")}
            </div>
          </div>
          <div className="ss-offline">
            <button type="button" id="ss-download" className="ss-download" disabled={ssView.downloading} onClick={() => wbScreensaver.prepareOffline()}>
              Prepare screen savers for offline use
            </button>
            <div id="ss-download-status" className="ss-download-status">{ssView.downloadStatus}</div>
          </div>
          <div className="ss-menu-note">
            Choose a clip, then click it again to preview. Prepare the clips while you have access to the app so they remain available after switching WiFi networks.
          </div>
        </div>
      </div>
      {ssView.clipSrc && (
        <div id="afk-overlay" className={ssView.active ? "on" : ""}>
          <video
            id="afk-video"
            ref={videoRef}
            src={ssView.clipSrc}
            data-clip={ssView.clipName}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            controls
            loop
            muted
            playsInline
          />
          <div id="afk-hint">Move mouse or press any key to return</div>
        </div>
      )}
    </>
  );
}
