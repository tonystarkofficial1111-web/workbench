import { useEffect, useState } from "react";
import { lastBackup } from "../features/shop";
import { openSaveChooser } from "../features/saves";

/** 10-minute backup reminder bar (original 5.46.0). The button opens the Block World / User saves chooser. */
export function BackupBar() {
  const [text, setText] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => {
    const loaded = Date.now();
    let lastPrompt = 0;
    const iv = setInterval(() => {
      const base = Math.max(lastBackup(), loaded, lastPrompt);
      if (Date.now() - base >= 6e5) {
        const m = Math.round((Date.now() - Math.max(lastBackup(), loaded)) / 6e4);
        setText("💾 " + (lastBackup() ? m + " min since your last backup." : "No backup yet this session (" + m + " min).") + " ");
        setShow(true);
        lastPrompt = Date.now();
      }
    }, 15000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="wb44-bar" style={{ display: show ? "flex" : "none" }}>
      <span>{text}</span>
      <button className="wb44-btn" type="button" onClick={() => { openSaveChooser(); setShow(false); }}>Back up…</button>
      <button className="wb44-btn ghost" type="button" onClick={() => setShow(false)}>Remind me later</button>
    </div>
  );
}
