import { useEffect, useRef, useState } from "react";
import { useEmitter } from "../core/store";
import {
  INV, LATER_LS, HIST_LS, addLater, agoMs, apiMessage, apiSearch, clearKey, delFrom, fetchInfo, fillTitle, getKey, inList, instOrder,
  invSearch, loadList, loadYtApi, parseId, refreshInstances, saveList, setKey, st, touchHist, ytEvents, type Vid,
} from "./yt";

const MODES = ["stream", "yt", "inv"] as const;
const MODE_NAME: Record<string, string> = { stream: "direct stream", yt: "YouTube embed", inv: "alternate embed" };
const CHIPS = ["Music", "Gaming", "Science", "Tech reviews", "How-to", "Comedy", "News"];
const isHttp = /^https?:$/.test(location.protocol);
const host = (u: string) => String(u).replace(/^https:\/\//, "").replace(/\/.*$/, "");

function Card({ v, mode, onPlay }: { v: Vid; mode: "search" | "later" | "hist"; onPlay: (v: Vid) => void }) {
  useEmitter(ytEvents);
  const on = inList(LATER_LS, v.id);
  return (
    <div className="yt-cardw">
      <button type="button" className="yt-card" onClick={() => onPlay(v)}>
        <div className="th">
          <img loading="lazy" alt="" src={"https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg"} />
          {v.dur ? <span className="dur">{v.dur}</span> : null}
        </div>
        <div className="t">{v.title || "YouTube video"}</div>
        <div className="m">{[v.by, v.meta].filter(Boolean).join(" · ")}</div>
      </button>
      <div className="yt-ctl">
        {mode !== "later" && (
          <button
            type="button" className={on ? "on" : ""}
            title={on ? "Saved to Watch later. Tap to remove." : "Watch later"}
            aria-label={on ? "Saved to Watch later. Tap to remove." : "Watch later"}
            onClick={(e) => { e.stopPropagation(); if (on) delFrom(LATER_LS, v.id); else addLater(v); }}
          >{on ? "✓" : "⏰"}</button>
        )}
        {mode !== "search" && (
          <button type="button" title="Remove" aria-label="Remove" onClick={(e) => { e.stopPropagation(); delFrom(mode === "later" ? LATER_LS : HIST_LS, v.id); }}>✕</button>
        )}
      </div>
    </div>
  );
}

export function OnlineView({ visible }: { visible: boolean }) {
  useEmitter(ytEvents);
  const [online, setOnline] = useState(navigator.onLine);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState({ msg: "Search for a video, or paste a YouTube link, to start watching.", bad: false });
  const [results, setResults] = useState<Vid[]>([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pane, setPane] = useState<"search" | "later" | "hist">("search");
  const [playing, setPlaying] = useState<{ id: string; title: string; by: string } | null>(null);
  const [nowTitle, setNowTitle] = useState("");
  const [err, setErr] = useState("");
  const [pmode, setPmode] = useState<string>("");
  const [quals, setQuals] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyVal, setKeyVal] = useState("");
  const [keyNote, setKeyNote] = useState(getKey() ? "API key saved in this browser." : "No key saved. Using free public servers.");
  const [clearArm, setClearArm] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const run = useRef({ q: "", mode: "", next: null as any, pending: null as string | null, token: 0, curId: null as string | null, curTitle: "", curBy: "", hiddenPaused: false, autoSwitched: false, pmode: "" });
  const qualRef = useRef<HTMLSelectElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const clearT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    refreshInstances();
    const on = () => { setOnline(true); const r = run.current; if (r.pending) { const p = r.pending; r.pending = null; setQ(p); doSearch(p); } else setStatus({ msg: "", bad: false }); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    // Stop the sound when the page is hidden (subtab, Back to Media, other tab).
    const iv = setInterval(() => {
      const r = run.current;
      if (!r.curId || !viewRef.current) return;
      if (viewRef.current.offsetParent === null) {
        if (r.hiddenPaused) return;
        r.hiddenPaused = true;
        if (r.pmode === "inv") closePlayer(); else pauseNow();
      } else r.hiddenPaused = false;
    }, 1000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(iv); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (m: string) => setErr(m || "");

  function clearFrame() {
    const f = frame.current;
    if (!f) return;
    const v = f.querySelector("video");
    if (v) { try { v.pause(); v.removeAttribute("src"); v.load(); } catch { /* ignore */ } }
    f.textContent = "";
    setQuals([]);
  }
  function pauseNow() {
    const f = frame.current;
    if (!f) return;
    const v = f.querySelector("video");
    if (v) { try { v.pause(); } catch { /* ignore */ } return; }
    const fr = f.firstChild as HTMLIFrameElement | null;
    try { if (fr && fr.contentWindow) fr.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*"); } catch { /* ignore */ }
  }
  function closePlayer() {
    run.current.token++;
    clearFrame();
    setPlaying(null);
    run.current.curId = null;
    say("");
  }

  function ytError(code: number) {
    const r = run.current;
    if ((code === 153 || code === 152) && !r.autoSwitched) {
      r.autoSwitched = true;
      say("YouTube blocks its embedded player on pages opened as a local file (error " + code + "). Switching to the direct stream…");
      startPlayer(r.curId!, "stream");
      return;
    }
    if (code === 101 || code === 150) say("The video's owner doesn't allow playing it outside YouTube. Try Switch player or Open on YouTube.");
    else if (code === 100) say("This video was removed or is private.");
    else say("YouTube player problem (error " + code + "). Try Switch player or Open on YouTube.");
  }
  function mountYT(id: string) {
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&playsinline=1&enablejsapi=1" + (isHttp ? "&origin=" + encodeURIComponent(location.origin) : "");
    f.title = "YouTube video player";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    frame.current!.appendChild(f);
    loadYtApi().then(() => {
      if (frame.current!.firstChild !== f) return;
      new (window as any).YT.Player(f, { events: { onError: (e: any) => { if (frame.current!.firstChild === f) ytError(e.data); } } });
    }).catch(() => {});
  }
  function mountInv(id: string) {
    const inst = INV[st.altIdx % INV.length]!;
    st.altIdx++;
    const f = document.createElement("iframe");
    f.src = inst + "/embed/" + id + "?autoplay=1";
    f.title = "Alternate video player";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    f.setAttribute("referrerpolicy", "no-referrer");
    f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    frame.current!.appendChild(f);
    say("Alternate embed via " + host(inst) + ". If it does not load, press Switch player until it comes back around, then it tries the next server.");
  }
  function mountStream(id: string, tk: number) {
    say("Loading direct stream…");
    const v = document.createElement("video");
    v.controls = true; v.autoplay = true; v.setAttribute("playsinline", ""); v.preload = "auto";
    v.poster = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
    v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;background:#000";
    frame.current!.appendChild(v);
    let rounds = 0;
    let info: Awaited<ReturnType<typeof fetchInfo>> | null = null;
    const fail = () => { if (tk !== run.current.token) return; say("Could not stream this video: the public servers are busy or blocked on this network. Press Switch player to try the YouTube embed, or Open on YouTube."); };
    function playUrl(idx: number, resume: number) {
      if (tk !== run.current.token || !info) return;
      const s = info.streams[idx] || (info.hls ? { url: info.hls, label: "live" } : null);
      if (!s) { st.bad[info.inst] = 1; attempt(); return; }
      let settled = false;
      const tmo = setTimeout(() => { if (!settled) { settled = true; next(); } }, 20000);
      function next() {
        if (tk !== run.current.token) return;
        if (idx + 1 < info!.streams.length) playUrl(idx + 1, resume);
        else { st.bad[info!.inst] = 1; attempt(); }
      }
      v.onloadeddata = () => { if (settled) return; settled = true; clearTimeout(tmo); st.goodInst = info!.inst; say("Playing via " + host(info!.inst) + " (" + s.label + "). If it stalls, press Switch player."); };
      v.onerror = () => { if (settled) return; settled = true; clearTimeout(tmo); next(); };
      if (resume) { const f = () => { v.removeEventListener("loadedmetadata", f); try { v.currentTime = resume; } catch { /* ignore */ } }; v.addEventListener("loadedmetadata", f); }
      v.src = s.url;
      if (qualRef.current) qualRef.current.value = String(idx);
      const pr = v.play();
      if (pr && pr.catch) pr.catch(() => {});
    }
    function attempt() {
      if (tk !== run.current.token) return;
      if (rounds++ >= 3) { fail(); return; }
      const batch = instOrder().slice(0, 4);
      (Promise as any).any(batch.map((i: string) => fetchInfo(i, id))).then((r: Awaited<ReturnType<typeof fetchInfo>>) => {
        if (tk !== run.current.token) return;
        info = r;
        setNowTitle((cur) => {
          if (r.title && /^YouTube video/.test(cur)) {
            run.current.curTitle = r.title; run.current.curBy = r.by || "";
            fillTitle(id, r.title, r.by);
            return r.title + (r.by ? " — " + r.by : "");
          }
          return cur;
        });
        setQuals(r.streams.map((s) => s.label));
        playUrl(0, 0);
      }).catch(() => attempt());
    }
    qualChange.current = (i: number) => { if (info) playUrl(i, v.currentTime || 0); };
    attempt();
  }
  const qualChange = useRef<(i: number) => void>(() => {});

  function startPlayer(id: string, mode: string) {
    const r = run.current;
    r.pmode = mode;
    setPmode(mode);
    const tk = ++r.token;
    clearFrame();
    say("");
    if (mode === "yt") mountYT(id); else if (mode === "inv") mountInv(id); else mountStream(id, tk);
  }
  function playId(id: string, title?: string, by?: string) {
    if (!/^[\w-]{11}$/.test(id)) return;
    const r = run.current;
    if (!navigator.onLine) { setOnline(false); setStatus({ msg: "📶 Connect to a Wi-Fi network first, then pick the video again.", bad: true }); return; }
    r.curId = id; r.hiddenPaused = false; r.autoSwitched = false; r.curTitle = title || ""; r.curBy = by || "";
    touchHist(id, r.curTitle, r.curBy);
    setPlaying({ id, title: r.curTitle, by: r.curBy });
    setNowTitle(title ? title + (by ? " — " + by : "") : "YouTube video");
    setTimeout(() => { startPlayer(id, isHttp ? "yt" : "stream"); try { boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* ignore */ } }, 0);
    if (!title) {
      fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + id))
        .then((x) => x.json())
        .then((j) => {
          if (run.current.curId === id && j && j.title) {
            const dec = (s: string) => { try { return new DOMParser().parseFromString(s, "text/html").documentElement.textContent || ""; } catch { return s; } };
            setNowTitle(dec(j.title) + (j.author_name ? " — " + dec(j.author_name) : ""));
            run.current.curTitle = dec(j.title); run.current.curBy = dec(j.author_name || "");
            fillTitle(id, run.current.curTitle, run.current.curBy);
          }
        }).catch(() => {});
    }
  }

  function doSearch(raw: string, loadMore = false) {
    const text = (raw || "").trim();
    const r = run.current;
    if (!text || busy) return;
    const id = !loadMore && parseId(text);
    if (id) { playId(id); return; }
    if (!navigator.onLine) { r.pending = text; setOnline(false); setStatus({ msg: "📶 No Wi-Fi or internet yet. Connect to a network and this search will run automatically.", bad: true }); return; }
    setBusy(true);
    setStatus({ msg: loadMore ? "Loading more…" : "Searching…", bad: false });
    const useKey = !!getKey();
    let note = "";
    const p: Promise<{ r: { items: Vid[]; next: any }; mode: string }> =
      loadMore && r.mode === "api" ? apiSearch(text, r.next).then((x) => ({ r: x, mode: "api" }))
      : loadMore && r.mode === "inv" ? invSearch(text, r.next).then((x) => ({ r: x, mode: "inv" }))
      : useKey ? apiSearch(text, null).then((x) => ({ r: x, mode: "api" })).catch((e) => {
          note = (e.reason ? apiMessage(e.reason) : "Could not reach YouTube.") + " Trying free servers instead. ";
          return invSearch(text, 1).then((x) => ({ r: x, mode: "inv" }));
        })
      : invSearch(text, 1).then((x) => ({ r: x, mode: "inv" }));
    p.then((o) => {
      r.q = text; r.mode = o.mode; r.next = o.r.next;
      if (!loadMore && !o.r.items.length) { setStatus({ msg: "No videos found for “" + text + "”.", bad: false }); setResults([]); setMore(false); return; }
      setResults((cur) => (loadMore ? cur.concat(o.r.items) : o.r.items));
      setStatus({ msg: note.trim(), bad: false });
      setMore(!!o.r.next);
    }).catch((e) => {
      setMore(false);
      if (!navigator.onLine) setStatus({ msg: "📶 You went offline. Reconnect to Wi-Fi and try again.", bad: true });
      else if (e && e.reason) setStatus({ msg: apiMessage(e.reason), bad: true });
      else if (e && e.message === "inv") {
        if (useKey) setStatus({ msg: note + "The free search servers did not respond either. You can still paste a video link to play it.", bad: true });
        else { setStatus({ msg: "Could not search right now: the free public search servers are busy or blocked on this network. Add a YouTube API key in Search settings below for reliable results, or paste a video link to play it directly.", bad: true }); setSettingsOpen(true); }
      } else setStatus({ msg: "Could not reach YouTube. Your Wi-Fi may be connected without internet, or this network blocks YouTube.", bad: true });
    }).then(() => setBusy(false));
  }

  const laterL = loadList(LATER_LS), histL = loadList(HIST_LS);
  const isLater = pane === "later";
  const saved = isLater ? laterL : histL;
  const curId = playing?.id || null;
  const curLater = !!(curId && inList(LATER_LS, curId));
  const s = pane === "search";

  return (
    <div className="vid-view" id="vid-online-view" ref={viewRef} style={{ display: visible ? "block" : "none" }}>
      <div className={"yt-net" + (online ? " on" : "")} id="yt-net">
        <span className="yt-dot"></span>
        <span id="yt-net-txt">{online ? "Online — videos stream straight from YouTube" : "Offline — connect to a Wi-Fi network to load videos"}</span>
      </div>
      <div className="yt-searchrow">
        <input id="yt-q" type="search" placeholder="Search YouTube, or paste a video link" autoComplete="off" enterKeyHint="search" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(q); } }} />
        <button type="button" id="yt-go" disabled={busy} onClick={() => doSearch(q)}>Search</button>
      </div>
      <div className="yt-panes" id="yt-panes">
        <button type="button" data-pane="search" className={s ? "on" : ""} onClick={() => setPane("search")}>&#128270; Search</button>
        <button type="button" data-pane="later" className={isLater ? "on" : ""} onClick={() => setPane("later")}>&#9200; Watch later <span id="yt-n-later">{laterL.length ? "(" + laterL.length + ")" : ""}</span></button>
        <button type="button" data-pane="hist" className={pane === "hist" ? "on" : ""} onClick={() => setPane("hist")}>&#128344; History <span id="yt-n-hist">{histL.length ? "(" + histL.length + ")" : ""}</span></button>
      </div>
      <div className="yt-chips" id="yt-chips" style={{ display: s ? "" : "none" }}>
        {CHIPS.map((c) => <button key={c} type="button" onClick={() => { setQ(c); doSearch(c); }}>{c}</button>)}
      </div>
      <div id="yt-player-box" ref={boxRef} style={{ display: playing ? "block" : "none" }}>
        <div className="yt-frame" id="yt-frame" ref={frame}></div>
        <div className="yt-now" id="yt-now-title">{nowTitle}</div>
        <div className="yt-err" id="yt-err" style={{ display: err ? "block" : "none" }}>{err}</div>
        <div className="yt-btnrow">
          <button type="button" id="yt-close" onClick={closePlayer}>&#10005; Close player</button>
          <button type="button" id="yt-open" onClick={() => { if (curId) window.open("https://www.youtube.com/watch?v=" + curId, "_blank", "noopener"); }}>Open on YouTube</button>
          <button type="button" id="yt-later" className={curLater ? "yt-on" : ""} onClick={() => {
            if (!curId) return;
            if (inList(LATER_LS, curId)) delFrom(LATER_LS, curId); else addLater({ id: curId, title: run.current.curTitle, by: run.current.curBy });
          }}>{curLater ? "✓ Saved to Watch later" : "⏰ Watch later"}</button>
          <button type="button" id="yt-alt" onClick={() => { if (curId) startPlayer(curId, MODES[(MODES.indexOf(run.current.pmode as any) + 1) % MODES.length]!); }}>
            Switch player{pmode ? " (" + MODE_NAME[pmode] + ")" : ""}
          </button>
          <select id="yt-qual" ref={qualRef} style={{ display: quals.length > 1 ? "" : "none" }} title="Quality" aria-label="Quality" onChange={(e) => qualChange.current(+e.target.value)}>
            {quals.map((l, i) => <option key={i} value={i}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className={"yt-status" + (status.bad ? " bad" : "")} id="yt-status" style={{ display: s ? "" : "none" }}>{status.msg}</div>
      <div id="yt-search-pane" style={{ display: s ? "" : "none" }}>
        <div className="yt-grid" id="yt-results">
          {results.map((v, i) => <Card key={v.id + i} v={v} mode="search" onPlay={(x) => playId(x.id, x.title, x.by)} />)}
        </div>
        <div style={{ textAlign: "center", margin: "14px 0" }}>
          <button type="button" className="yt-more" id="yt-more" style={{ display: more ? "" : "none" }} disabled={busy} onClick={() => doSearch(run.current.q, true)}>Load more</button>
        </div>
      </div>
      <div id="yt-saved-pane" style={{ display: s ? "none" : "" }}>
        <div className="yt-saved-head">
          <strong id="yt-saved-title">{isLater ? "Watch later" : "Recently watched"}</strong>
          <button type="button" className="yt-ghost" id="yt-saved-clear" style={{ display: !isLater && histL.length ? "" : "none" }} onClick={() => {
            if (!clearArm) { setClearArm(true); clearT.current = setTimeout(() => setClearArm(false), 3000); return; }
            if (clearT.current) clearTimeout(clearT.current);
            setClearArm(false);
            saveList(HIST_LS, []);
          }}>{clearArm ? "Tap again to clear" : "Clear history"}</button>
        </div>
        <div className="yt-saved-note" id="yt-saved-note">
          {saved.length ? "" : isLater ? "Nothing saved yet. Tap the ⏰ on any video, or press Watch later while one is playing." : "Videos you play show up here so you can replay them in one tap."}
        </div>
        <div className="yt-grid" id="yt-saved-grid">
          {saved.map((v) => <Card key={v.id} v={{ id: v.id, title: v.title, by: v.by, meta: (isLater ? "Saved " : "Watched ") + agoMs(v.t || 0) }} mode={isLater ? "later" : "hist"} onPlay={(x) => playId(x.id, x.title, x.by)} />)}
        </div>
      </div>
      <details className="yt-settings" id="yt-settings" open={settingsOpen} onToggle={(e) => setSettingsOpen((e.target as HTMLDetailsElement).open)}>
        <summary>&#9881; Search settings</summary>
        <p>Searching works best with your own free YouTube Data API key (Google Cloud Console &rarr; enable <b>YouTube Data API v3</b> &rarr; Credentials &rarr; Create API key; under &ldquo;API restrictions&rdquo; pick YouTube Data API v3 only). Each search or &ldquo;Load more&rdquo; costs 100 of the 10,000 free daily units, so about 100 per day. The key stays in this browser only. Without a key, Workbench tries free public search servers, which are often busy or down.</p>
        <div className="yt-searchrow">
          <input id="yt-key" type="password" placeholder={getKey() ? "Key saved (hidden). Paste a new one to replace it." : "YouTube API key"} autoComplete="off" spellCheck={false} value={keyVal} onChange={(e) => setKeyVal(e.target.value)} />
          <button type="button" id="yt-key-save" onClick={() => {
            const v = keyVal.trim();
            if (!v) { setKeyNote("Paste a key first."); return; }
            if (!setKey(v)) { setKeyNote("Could not save the key in this browser."); return; }
            setKeyVal(""); setKeyNote("Saved. Searches now use your key.");
          }}>Save</button>
          <button type="button" id="yt-key-clear" className="yt-ghost" onClick={() => { clearKey(); setKeyVal(""); setKeyNote("No key saved. Using free public servers."); }}>Clear</button>
        </div>
        <div className="yt-keynote" id="yt-keynote">{keyNote}</div>
      </details>
    </div>
  );
}
