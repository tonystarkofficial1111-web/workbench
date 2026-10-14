import { useEffect, useRef, useState } from "react";
import { useValue } from "../core/store";
import { closeSaveChooser, exportBlockWorld, exportUserSaves, saveChooser, videoSummary } from "../features/saves";
import { vFmt } from "../media/videoDb";

/**
 * "What do you want to save?" Every save / export / back-up button in the app opens this first:
 * the Block World, or User saves (everything except the Block World).
 */
export function SaveChooser() {
  const open = useValue(saveChooser);
  const [vids, setVids] = useState({ count: 0, bytes: 0 });
  const [withVideos, setWithVideos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ msg: string; ok: boolean } | null>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setBusy(false);
    setWithVideos(true);
    let live = true;
    videoSummary().then((s) => { if (live) setVids(s); });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeSaveChooser();
    };
    window.addEventListener("keydown", onKey, true);
    const t = window.setTimeout(() => first.current?.focus(), 30);
    return () => {
      live = false;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  if (!open) return null;

  const saveWorld = () => {
    setBusy(true);
    try { setDone({ msg: exportBlockWorld(), ok: true }); }
    catch (e: any) { setDone({ msg: "Could not save the Block World: " + (e && e.message ? e.message : e), ok: false }); }
    setBusy(false);
  };
  const saveUser = async () => {
    setBusy(true);
    try { setDone({ msg: await exportUserSaves(vids.count > 0 && withVideos), ok: true }); }
    catch (e: any) { setDone({ msg: "Could not write the User saves file: " + (e && e.message ? e.message : e), ok: false }); }
    setBusy(false);
  };

  return (
    <div className="wb-sv" id="save-chooser" onClick={(e) => { if (e.target === e.currentTarget) closeSaveChooser(); }}>
      <div className="wb-sv-card" role="dialog" aria-modal="true" aria-labelledby="save-chooser-title">
        <h3 id="save-chooser-title">What do you want to save?</h3>
        {done ? (
          <>
            <p className={"wb-sv-done" + (done.ok ? "" : " bad")} id="save-chooser-done">{done.msg}</p>
            <button type="button" className="wb44-btn" id="save-chooser-close" onClick={closeSaveChooser}>Done</button>
          </>
        ) : (
          <>
            <p className="wb-sv-sub">Pick one. They are two separate files, and you can save the other one afterwards.</p>
            <div className="wb-sv-opts">
              <button type="button" ref={first} id="save-choose-world" className="wb-sv-opt" disabled={busy} onClick={saveWorld}>
                <span className="wb-sv-ico" aria-hidden="true">🌍</span>
                <b>Block World</b>
                <span>Your island: blocks, trees, farms, houses, villagers, inventory and camera, plus the Block World&rsquo;s own numbers (rare-ore bank, best wave, Infinite day, most defenses built, graphics level). Nothing else.</span>
              </button>
              <button type="button" id="save-choose-user" className="wb-sv-opt" disabled={busy} onClick={saveUser}>
                <span className="wb-sv-ico" aria-hidden="true">🕹️</span>
                <b>User saves</b>
                <span>Everything except the Block World: profile and picture, arcade progress and scores, badges, coins, shop and themes, notes, flashcards, study data, AI memory and chat, My Files, daily challenge, settings and your video library.</span>
              </button>
            </div>
            {vids.count > 0 && (
              <label className="wb-sv-check">
                <input type="checkbox" id="save-chooser-videos" checked={withVideos} onChange={(e) => setWithVideos(e.target.checked)} />
                <span>User saves: include my video library ({vids.count} video{vids.count === 1 ? "" : "s"}, {vFmt(vids.bytes)}). The file is then a <code>.wbsave</code>.</span>
              </label>
            )}
            <p className="wb-sv-note">User saves also holds anything you typed in, like a YouTube API key or a server address, so keep that file private.</p>
            <button type="button" className="wb44-btn ghost" id="save-chooser-cancel" onClick={closeSaveChooser}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
