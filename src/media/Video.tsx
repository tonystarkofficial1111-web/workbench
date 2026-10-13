import { useEffect, useRef, useState } from "react";
import { useEmitter } from "../core/store";
import { vAdd, vDel, vFmt, vGet, vGetAll, videoEvents, type VideoRec } from "./videoDb";
import { wbB64 } from "../core/b64";
import { lsGetRaw, lsSetRaw } from "../core/store";
import { OnlineView } from "./Online";

type SubTab = "online" | "library" | "sync" | "share";
const CHUNK = 16384;

function useVideos() {
  useEmitter(videoEvents);
  const [vids, setVids] = useState<VideoRec[]>([]);
  useEffect(() => { vGetAll().then(setVids); }, [videoEvents.getVersion()]); // eslint-disable-line react-hooks/exhaustive-deps
  return vids;
}

/* ------------------------------ Library ------------------------------ */
function Library({ onPlay }: { onPlay: (id: number) => void }) {
  const vids = useVideos().slice().sort((a, b) => b.added - a.added);
  const input = useRef<HTMLInputElement>(null);
  const total = vids.reduce((a, v) => a + v.size, 0);
  return (
    <>
      <div className="vid-actions">
        <button id="vid-import-btn" onClick={() => input.current?.click()}>Import video</button>
        <input type="file" id="vid-import-input" ref={input} accept="video/*" multiple hidden onChange={async (e) => {
          const files = e.target.files;
          if (files) for (let i = 0; i < files.length; i++) await vAdd(files[i]!);
          e.target.value = "";
        }} />
        <span className="vid-storage" id="vid-storage-info">{vids.length + " video" + (vids.length === 1 ? "" : "s") + " · " + vFmt(total) + " stored"}</span>
      </div>
      <div className="vid-list" id="vid-list">
        {!vids.length ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "40px 0" }}>No videos yet. Click Import video to add one.</p>
        ) : vids.map((v) => (
          <div className="vid-item" key={v.id}>
            <div><div className="vid-item-name">{v.name}</div><div className="vid-item-size">{vFmt(v.size)}</div></div>
            <div className="vid-item-actions">
              <button className="vid-play-btn" onClick={() => onPlay(v.id)}>Play</button>
              <button className="vid-delete-btn" onClick={() => vDel(v.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* -------------------------------- Sync -------------------------------- */
interface SyncVid { name: string; size: number; url: string; type?: string }
function Sync() {
  const [addr, setAddr] = useState(lsGetRaw("wb_server_addr") || "");
  const [status, setStatus] = useState("");
  const [list, setList] = useState<SyncVid[]>([]);
  const [base, setBase] = useState("");
  const [dl, setDl] = useState<Record<string, { label: string; prog: string; disabled: boolean }>>({});

  const find = () => {
    const a = addr.trim().replace(/\/$/, "");
    if (!a) { setStatus("Enter your G16 server address first."); return; }
    lsSetRaw("wb_server_addr", a);
    setStatus("Connecting to " + a + "...");
    setList([]);
    const xhr = new XMLHttpRequest();
    xhr.open("GET", a + "/api/videos", true);
    xhr.timeout = 8000;
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const videos: SyncVid[] = JSON.parse(xhr.responseText);
          if (!videos.length) { setStatus("No videos found on the server. Put video files in the folder on your G16."); return; }
          setStatus("Found " + videos.length + " video" + (videos.length === 1 ? "" : "s") + ". Click Download to add to your library.");
          setBase(a);
          setList(videos);
        } catch { setStatus("Could not read the server response."); }
      } else setStatus("Server responded with error " + xhr.status + ". Make sure the G16 server is running.");
    };
    xhr.ontimeout = () => setStatus("Connection timed out. Check that your phone is on home WiFi and the G16 server is running.");
    xhr.onerror = () => setStatus("Could not connect. Check the address, that your phone is on home WiFi, and the G16 server is running.");
    xhr.send();
  };
  const download = (v: SyncVid, i: number) => {
    const set = (p: Partial<{ label: string; prog: string; disabled: boolean }>) => setDl((d) => ({ ...d, [i]: { label: "Download", prog: "", disabled: false, ...d[i], ...p } }));
    set({ disabled: true, label: "Downloading...", prog: "0%" });
    const xhr = new XMLHttpRequest();
    xhr.open("GET", base + v.url, true);
    xhr.responseType = "blob";
    xhr.onprogress = (e) => { if (e.lengthComputable) set({ prog: Math.round((e.loaded / e.total) * 100) + "%" }); };
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 206) {
        const file = new File([xhr.response], v.name, { type: v.type || "video/mp4" });
        vAdd(file).then(() => set({ label: "Done", prog: "Saved" })).catch(() => set({ label: "Failed", prog: "Error saving", disabled: false }));
      } else set({ label: "Failed", prog: "Error " + xhr.status, disabled: false });
    };
    xhr.onerror = () => set({ label: "Failed", prog: "Connection error", disabled: false });
    xhr.send();
  };
  const code = (s: string) => <code style={{ color: "var(--cyan)" }}>{s}</code>;
  return (
    <div className="vid-sync-section">
      <h3>Sync from home server</h3>
      <p>Download videos from your G16 laptop to your phone over your home Spectrum WiFi. At school, the videos are already on your phone — no cellular data needed for sharing.</p>
      <div className="vid-sync-input-row">
        <input id="vid-server-addr" type="text" placeholder="http://192.168.1.42:8787" autoComplete="off" value={addr}
          onChange={(e) => setAddr(e.target.value)} onBlur={() => lsSetRaw("wb_server_addr", addr.trim())} />
        <button id="vid-find-btn" onClick={find}>Find videos</button>
      </div>
      <div className="vid-sync-list" id="vid-sync-list">
        {list.map((v, i) => {
          const d = dl[i] || { label: "Download", prog: "", disabled: false };
          return (
            <div className="vid-sync-item" key={i}>
              <div><div className="vid-sync-item-name">{v.name}</div><div className="vid-sync-item-size">{vFmt(v.size)}</div></div>
              <div className="vid-sync-item-actions">
                <button className="vid-sync-dl-btn" disabled={d.disabled} onClick={() => download(v, i)}>{d.label}</button>
                <span className="vid-sync-progress">{d.prog}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="vid-sync-status" id="vid-sync-status">{status}</div>
      <div className="vid-sync-note">
        <strong>How to set up the G16 server:</strong><br />
        1. Put your video files (.mp4, .webm, etc.) in your Videos folder on the G16.<br />
        2. On the G16, find the {code("g16_video_server.py")} file and <strong>double-click it</strong>. A black window opens.<br />
        &nbsp;&nbsp;&nbsp;(If that doesn't work: press the Windows key, type {code("cmd")}, press Enter. Then type {code("python g16_video_server.py")} and press Enter.)<br />
        3. The black window shows an address like {code("http://192.168.1.42:8787")} — copy that down.<br />
        4. Leave the black window open. On your phone (same WiFi), open Workbench → Media → Video → Sync.<br />
        5. Type the address in the box above and click "Find videos".<br />
        6. Tap each video to download it to your phone.<br />
        7. At school: open Share, turn on your phone hotspot, and use the code-sharing flow. Videos transfer phone-to-phone over WiFi — no internet needed.<br /><br />
        <strong>Important:</strong> Sync videos while connected to home WiFi. Use the same Workbench file at school that you synced with — videos are stored in this browser's offline storage.
      </div>
    </div>
  );
}

/* -------------------------------- Share -------------------------------- */
const HELP: [string, [string, string][]][] = [
  ["Before School — Sync Videos", [
    ["Run the server on your G16", "At home, double-click the g16_video_server.py file on your G16. A black window opens and shows an address like http://192.168.1.42:8787. Both your phone and G16 must be on the same Spectrum WiFi. Leave the black window open."],
    ["Enter the address in Workbench", 'Open the Videos tab, click "Sync", type in the address from step 1.'],
    ["Download videos", 'Click "Find videos", then tap each one to download. Videos are saved on your phone. They work offline at school.'],
  ]],
  ["At School — Share Videos", [
    ["Turn on hotspot", "Turn on your phone's Wi-Fi hotspot. Have your friends connect to it."],
    ["Open the Share tab", 'Click "Share". You will see your synced videos with checkboxes. Check which ones to send.'],
    ["Start hosting", 'Click "Start hosting". A code appears in the text box. Give this code to your friend (type it, show your screen, etc.).'],
    ["Paste their response", 'Your friend generates a response code. Paste it in the Step 3 box and click "Connect & send".'],
    ["Videos transfer", "Videos send one by one. Watch the progress. When done, your friend has the videos in their Library."],
  ]],
  ["Receiver — Getting Videos", [
    ["Connect to hotspot", "Make sure you are connected to the host's Wi-Fi hotspot network."],
    ["Get the host's code", 'Ask the host for their code. Paste it in the Join section under "Paste the host\'s code here".'],
    ["Generate response", 'Click "Generate response". A response code appears. Give this back to the host.'],
    ["Receive videos", "Once the host connects, videos transfer automatically. Progress shows on screen. When complete, videos appear in your Library."],
    ["Watch offline", 'Go to the Library tab and click "Play" on any video. Works fully offline.'],
  ]],
];
const TIPS: [string, string][] = [
  ["Compress videos", "Use WebM or MP4 format. 720p movies are about 700MB-1.3GB each."],
  ["Stay close", "The closer devices are to the hotspot, the faster the transfer."],
  ["One host at a time", "Only one person hosts. Everyone else joins. The host can send to one friend at a time."],
];

function waitIce(pc: RTCPeerConnection) {
  return new Promise<void>((res) => {
    if (pc.iceGatheringState === "complete") return res();
    const chk = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", chk); res(); } };
    pc.addEventListener("icegatheringstatechange", chk);
    setTimeout(() => res(), 4000);
  });
}

function Share() {
  const vids = useVideos();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const [hostArea, setHostArea] = useState(false);
  const [offer, setOffer] = useState("");
  const [answerIn, setAnswerIn] = useState("");
  const [hostStatus, setHostStatus] = useState("");
  const [joinOffer, setJoinOffer] = useState("");
  const [joinArea, setJoinArea] = useState(false);
  const [answerOut, setAnswerOut] = useState("");
  const [joinStatus, setJoinStatus] = useState("");
  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const chk = (id: number) => checked[id] !== false; // all start checked
  const idsRef = useRef<number[]>([]);
  idsRef.current = vids.filter((v) => chk(v.id)).map((v) => v.id);

  function setupDC(channel: RTCDataChannel, isHost: boolean) {
    channel.binaryType = "arraybuffer";
    const setS = isHost ? setHostStatus : setJoinStatus;
    let recvMeta: any = null, recvChunks: ArrayBuffer[] = [], recvSize = 0;
    let queue: number[] = [], meta: VideoRec | null = null, offset = 0;

    const sendChunk = () => {
      if (!meta || channel.readyState !== "open") return;
      const slice = meta.blob.slice(offset, offset + CHUNK);
      const reader = new FileReader();
      reader.onload = (e) => {
        const buf = e.target!.result as ArrayBuffer;
        channel.send(buf);
        offset += buf.byteLength;
        setS("Sending: " + meta!.name + " — " + Math.round((offset / meta!.size) * 100) + "%");
        if (offset < meta!.size) {
          if (channel.bufferedAmount > 4 * 1048576) channel.onbufferedamountlow = () => { channel.onbufferedamountlow = null; sendChunk(); };
          else sendChunk();
        } else { meta = null; setTimeout(sendNext, 300); }
      };
      reader.readAsArrayBuffer(slice);
    };
    const sendNext = () => {
      if (!queue.length) {
        if (channel.readyState === "open") channel.send(JSON.stringify({ type: "done" }));
        setS("All videos sent!");
        return;
      }
      vGet(queue.shift()!).then((v) => {
        if (!v) { sendNext(); return; }
        meta = v; offset = 0;
        channel.send(JSON.stringify({ type: "meta", name: v.name, size: v.size, fileType: v.type }));
        sendChunk();
      });
    };
    channel.onopen = () => {
      setS(isHost ? "Connected! Sending videos..." : "Connected!");
      if (isHost) {
        const ids = idsRef.current;
        if (!ids.length) { channel.send(JSON.stringify({ type: "done" })); return; }
        queue = ids.slice();
        sendNext();
      }
    };
    channel.onmessage = (e) => {
      if (typeof e.data === "string") {
        const msg = JSON.parse(e.data);
        if (msg.type === "meta") { recvMeta = msg; recvChunks = []; recvSize = 0; setJoinStatus("Receiving: " + msg.name + " (" + vFmt(msg.size) + ")"); }
        else if (msg.type === "done") setJoinStatus("All videos received!");
      } else {
        recvChunks.push(e.data);
        recvSize += e.data.byteLength;
        if (recvMeta) {
          setJoinStatus("Receiving: " + recvMeta.name + " — " + Math.round((recvSize / recvMeta.size) * 100) + "%");
          if (recvSize >= recvMeta.size) {
            const m = recvMeta;
            const blob = new Blob(recvChunks, { type: m.fileType || m.type || "video/mp4" });
            const file = new File([blob], m.name, { type: m.type });
            vAdd(file).then(() => setJoinStatus("Saved: " + m.name));
            recvMeta = null; recvChunks = [];
          }
        }
      }
    };
    channel.onclose = () => setS("Connection closed.");
  }

  return (
    <>
      <button className="vid-help-btn" id="vid-help-btn" onClick={() => setHelpOpen(true)}>How it works</button>
      <div className="vid-modal-bg" id="vid-modal-bg" style={{ display: helpOpen ? "flex" : "none" }} onClick={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
        <div className="vid-modal">
          <button className="vid-modal-close" id="vid-modal-close" onClick={() => setHelpOpen(false)}>&times;</button>
          <h3>How Video Sharing Works</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px" }}>Videos transfer directly between devices over your hotspot's local network. No internet needed after the initial connection.</p>
          {HELP.map(([sec, steps]) => (
            <div key={sec} style={{ display: "contents" }}>
              <div className="vsec">{sec}</div>
              {steps.map(([t, d], i) => (
                <div className="vstep" key={t}><div className="vstep-n">{i + 1}</div><div className="vstep-t">{t}</div><div className="vstep-d">{d}</div></div>
              ))}
            </div>
          ))}
          <div className="vsec">Tips</div>
          {TIPS.map(([t, d]) => (<div className="vstep" key={t}><div className="vstep-t">{t}</div><div className="vstep-d">{d}</div></div>))}
        </div>
      </div>
      <div className="vid-share-section">
        <h3>Host — Send videos</h3>
        <p>Select videos from your library, then start hosting. Share the code with a friend on your hotspot network.</p>
        <div id="vid-share-list">
          {!vids.length ? <p style={{ color: "var(--muted)" }}>No videos in library. Import some first.</p> : vids.map((v) => (
            <div className="vid-share-item" key={v.id}>
              <label><input type="checkbox" className="vid-share-check" checked={chk(v.id)} onChange={(e) => setChecked((c) => ({ ...c, [v.id]: e.target.checked }))} /> <span>{v.name + " (" + vFmt(v.size) + ")"}</span></label>
            </div>
          ))}
        </div>
        <button id="vid-host-btn" onClick={() => {
          const p = new RTCPeerConnection({ iceServers: [] });
          pc.current = p;
          const ch = p.createDataChannel("files", { ordered: true });
          dc.current = ch;
          setupDC(ch, true);
          p.createOffer().then((o) => p.setLocalDescription(o)).then(() => waitIce(p)).then(() => { setOffer(wbB64.enc(p.localDescription!.sdp)); setHostArea(true); });
        }}>Start hosting</button>
        <div id="vid-host-area" style={{ display: hostArea ? "block" : "none" }}>
          <label>Step 1 — Give this code to your friend:</label>
          <textarea id="vid-offer-code" readOnly value={offer}></textarea>
          <label>Step 3 — Paste your friend's response code here:</label>
          <textarea id="vid-answer-input" value={answerIn} onChange={(e) => setAnswerIn(e.target.value)}></textarea>
          <button id="vid-connect-btn" onClick={() => {
            if (!answerIn.trim()) { setHostStatus("Paste your friend's response code first."); return; }
            setHostStatus("Connecting...");
            pc.current!.setRemoteDescription({ type: "answer", sdp: wbB64.dec(answerIn.trim()) })
              .then(() => setHostStatus("Connected!"))
              .catch((err) => setHostStatus("Connection failed: " + err.message));
          }}>Connect &amp; send</button>
          <div className="vid-status" id="vid-host-status">{hostStatus}</div>
        </div>
      </div>
      <div className="vid-share-section">
        <h3>Join — Receive videos</h3>
        <p>Get a code from the host, paste it below, and generate a response code to send back.</p>
        <label>Step 1 — Paste the host's code here:</label>
        <textarea id="vid-join-offer" value={joinOffer} onChange={(e) => setJoinOffer(e.target.value)}></textarea>
        <button id="vid-join-btn" onClick={() => {
          if (!joinOffer.trim()) { setJoinStatus("Paste the host's code first."); return; }
          const p = new RTCPeerConnection({ iceServers: [] });
          pc.current = p;
          p.ondatachannel = (e) => { dc.current = e.channel; setupDC(e.channel, false); };
          p.setRemoteDescription({ type: "offer", sdp: wbB64.dec(joinOffer.trim()) })
            .then(() => p.createAnswer()).then((a) => p.setLocalDescription(a)).then(() => waitIce(p))
            .then(() => { setAnswerOut(wbB64.enc(p.localDescription!.sdp)); setJoinArea(true); setJoinStatus("Waiting for host to connect..."); });
        }}>Generate response</button>
        <div id="vid-join-area" style={{ display: joinArea ? "block" : "none" }}>
          <label>Step 2 — Give this code to the host:</label>
          <textarea id="vid-answer-code" readOnly value={answerOut}></textarea>
          <div className="vid-status" id="vid-join-status">{joinStatus}</div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ Video section ------------------------------ */
export function VideoSection({ onBack }: { onBack: () => void }) {
  const [sub, setSub] = useState<SubTab>("online");
  const [playing, setPlaying] = useState<{ title: string; url: string } | null>(null);
  const player = useRef<HTMLVideoElement>(null);
  const urlRef = useRef("");

  const play = async (id: number) => {
    const v = await vGet(id);
    if (!v) return;
    const url = URL.createObjectURL(v.blob);
    urlRef.current = url;
    setPlaying({ title: v.name, url });
  };
  useEffect(() => {
    const pl = player.current;
    if (!playing || !pl) return;
    pl.src = playing.url;
    // Recorded WebM clips lack a duration; seeking to the end once makes the player learn it.
    pl.onloadedmetadata = () => {
      if (pl.duration === Infinity) {
        pl.onseeked = () => { pl.onseeked = null; pl.currentTime = 0; const pp = pl.play(); if (pp && pp.catch) pp.catch(() => {}); };
        pl.currentTime = 1e101;
      }
    };
    pl.play().catch(() => {});
    pl.onended = () => URL.revokeObjectURL(playing.url);
  }, [playing]);

  const subBtn = (k: SubTab, label: string) => (
    <button className={"vid-subtab" + (sub === k ? " active" : "")} data-vidtab={k} onClick={() => { setSub(k); setPlaying(null); }}>{label}</button>
  );
  return (
    <div id="media-video-content">
      <button className="ghost" id="media-back-btn" style={{ marginBottom: 12 }} onClick={onBack}>← Back to Media</button>
      <div className="vid-subtabs">
        {subBtn("online", "▶ Online")}{subBtn("library", "Library")}{subBtn("sync", "Sync")}{subBtn("share", "Share")}
      </div>
      <OnlineView visible={sub === "online"} />
      <div className="vid-view" id="vid-library-view" style={{ display: sub === "library" && !playing ? "block" : "none" }}><Library onPlay={play} /></div>
      <div className="vid-view" id="vid-sync-view" style={{ display: sub === "sync" && !playing ? "block" : "none" }}><Sync /></div>
      <div className="vid-view" id="vid-share-view" style={{ display: sub === "share" && !playing ? "block" : "none" }}><Share /></div>
      <div className="vid-view vid-player-wrap" id="vid-player-view" style={{ display: playing ? "flex" : "none" }}>
        <h3 id="vid-player-title">{playing?.title}</h3>
        <video id="vid-player" ref={player} controls></video>
        <button id="vid-close-player" onClick={() => { const pl = player.current; if (pl) { pl.pause(); pl.src = ""; } setPlaying(null); }}>Back to library</button>
      </div>
    </div>
  );
}
