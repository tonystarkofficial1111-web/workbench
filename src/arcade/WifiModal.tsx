import { useState, useRef } from "react";
import { Value, useValue } from "../core/store";
import { getProfile, saveProfile } from "../core/profile";
import { wbB64 } from "../core/b64";

/** "Connect to the Wi-Fi" dialog (original 5.18 WebRTC + share code + 5.19 Quick Code). */
export const wifiOpen = new Value(false);

const bestScore = (hs: Record<string, Record<string, number>>) => {
  let b = 0;
  Object.keys(hs).forEach((gk) => Object.keys(hs[gk] || {}).forEach((m) => { if (hs[gk]![m]! > b) b = hs[gk]![m]!; }));
  return b;
};
const gather = (pc: RTCPeerConnection) =>
  new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const check = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", check); resolve(); } };
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(() => resolve(), 1500);
  });
const shareOut = () => {
  try {
    const p = getProfile();
    const data = { name: (p && p.name) || "Player", highScores: p.highScores || {} };
    return wbB64.enc(unescape(encodeURIComponent(JSON.stringify(data))));
  } catch { return ""; }
};

export function WifiModal() {
  const on = useValue(wifiOpen);
  const [tab, setTab] = useState<"connect" | "share">("connect");
  const [status, setStatus] = useState<{ msg: string; kind: string }>({ msg: "Idle. Host a session or join one.", kind: "" });
  const [hostArea, setHostArea] = useState(false);
  const [joinArea, setJoinArea] = useState(false);
  const [offerOut, setOfferOut] = useState("");
  const [answerIn, setAnswerIn] = useState("");
  const [offerIn, setOfferIn] = useState("");
  const [answerOut, setAnswerOut] = useState("");
  const [shareIn, setShareIn] = useState("");
  const [peers, setPeers] = useState<{ name: string; score: number }[]>([]);
  const [room, setRoom] = useState(""), [hub, setHub] = useState(""), [quick, setQuick] = useState("No hub configured — Quick Code needs one. The Offline Direct Code above always works without a hub.");
  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const shareRef = useRef<HTMLTextAreaElement>(null);
  const st = (msg: string, kind = "") => setStatus({ msg, kind });

  const lbRows = (() => {
    const rows: { name: string; score: number }[] = [];
    try { const p = getProfile(); rows.push({ name: (p.name || "You") + " (you)", score: bestScore(p.highScores || {}) }); } catch { /* ignore */ }
    return rows.concat(peers).sort((a, b) => b.score - a.score);
  })();

  const sendLB = () => { if (dc.current && dc.current.readyState === "open") { try { dc.current.send(JSON.stringify({ type: "lb", code: shareOut() })); } catch { /* ignore */ } } };
  const onData = (data: string) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "lb") {
        const d = JSON.parse(decodeURIComponent(escape(wbB64.dec(msg.code))));
        setPeers([{ name: d.name || "Friend", score: bestScore(d.highScores || {}) }]);
        st("Received " + (d.name || "friend") + "'s leaderboard.", "ok");
      }
    } catch { /* ignore */ }
  };
  const wire = (ch: RTCDataChannel) => {
    dc.current = ch;
    ch.onopen = () => { st("Connected! Sharing leaderboard.", "ok"); sendLB(); };
    ch.onmessage = (ev) => onData(ev.data);
  };
  const onState = (p: RTCPeerConnection) => { p.onconnectionstatechange = () => { if (p.connectionState === "disconnected" || p.connectionState === "failed") st("Disconnected.", "err"); }; };

  async function host() {
    try {
      const p = new RTCPeerConnection({ iceServers: [] });
      pc.current = p;
      wire(p.createDataChannel("leaderboard"));
      onState(p);
      const offer = await p.createOffer();
      await p.setLocalDescription(offer);
      await gather(p);
      setOfferOut(wbB64.enc(JSON.stringify(p.localDescription)));
      st("Copy your code and send it to the other player. Then paste their answer below.", "ok");
      setHostArea(true); setJoinArea(false);
    } catch (e: any) { st("Could not start hosting: " + e.message, "err"); }
  }
  async function applyAnswer() {
    try {
      const code = answerIn.trim();
      if (!code) { st("Paste the other player's answer code first.", "err"); return; }
      await pc.current!.setRemoteDescription(JSON.parse(wbB64.dec(code)));
      st("Answer applied. Waiting for connection…", "ok");
    } catch (e: any) { st("Invalid answer code: " + e.message, "err"); }
  }
  async function makeAnswer() {
    try {
      const code = offerIn.trim();
      if (!code) { st("Paste the host's code first.", "err"); return; }
      const p = new RTCPeerConnection({ iceServers: [] });
      pc.current = p;
      p.ondatachannel = (e) => wire(e.channel);
      onState(p);
      await p.setRemoteDescription(JSON.parse(wbB64.dec(code)));
      const ans = await p.createAnswer();
      await p.setLocalDescription(ans);
      await gather(p);
      setAnswerOut(wbB64.enc(JSON.stringify(p.localDescription)));
      st("Copy your answer and send it back to the host.", "ok");
    } catch (e: any) { st("Invalid host code: " + e.message, "err"); }
  }
  function merge(code: string) {
    try {
      const data = JSON.parse(decodeURIComponent(escape(wbB64.dec(code.trim()))));
      let merged = 0;
      const p = getProfile();
      const hs = data.highScores || {};
      Object.keys(hs).forEach((gk) => {
        p.highScores[gk] = p.highScores[gk] || {};
        Object.keys(hs[gk] || {}).forEach((m) => {
          if ((hs[gk][m] || 0) > (p.highScores[gk]![m] || 0)) { p.highScores[gk]![m] = hs[gk][m]; merged++; }
        });
      });
      if (data.name) setPeers([{ name: data.name, score: bestScore(hs) }]);
      saveProfile();
      st("Merged " + merged + " score(s) from " + (data.name || "friend") + ".", "ok");
    } catch { st("That code looks invalid. Check it and try again.", "err"); }
  }
  function quickGo() {
    const r = room.trim(), h = hub.trim();
    if (!r) { setQuick("Enter a room code first."); return; }
    if (!h) { setQuick("Quick Code needs a classroom hub address. Ask your teacher, or use the Offline Direct Code above to pair without a hub."); return; }
    setQuick('Connecting to room "' + r + '" via ' + h + "…");
    try {
      const ws = new WebSocket(h.replace(/^http/i, "ws").replace(/\/$/, "") + "/room/" + encodeURIComponent(r));
      ws.onopen = () => setQuick('Connected to hub. Waiting for the other player on room "' + r + '"…');
      ws.onerror = () => setQuick("Could not reach the hub at " + h + ". Make sure it is running on the same Wi-Fi, or pair with the Offline Direct Code above.");
      ws.onclose = () => setQuick("Disconnected from hub.");
    } catch (e: any) { setQuick("Could not connect: " + e.message); }
  }

  return (
    <div className={"wifi-modal" + (on ? " on" : "")} id="wifi-modal" role="dialog" aria-modal="true" aria-label="Connect to the Wi-Fi" onClick={(e) => { if (e.target === e.currentTarget) wifiOpen.set(false); }}>
      <div className="wm-box">
        <h3>📡 Connect to the Wi-Fi</h3>
        <p className="wm-sub">Make sure every computer is on the <b>same Wi-Fi network</b>. No internet is needed — this uses a direct local connection. If your school blocks direct connections, use the <b>Share Code</b> tab to swap leaderboards by copy/paste instead.</p>
        <div className="wm-tabs" id="wifi-tabs">
          <button className={tab === "connect" ? "active" : ""} data-wmtab="connect" type="button" onClick={() => setTab("connect")}>Direct Connect</button>
          <button className={tab === "share" ? "active" : ""} data-wmtab="share" type="button" onClick={() => setTab("share")}>Share Code</button>
        </div>
        <div className={"wm-panel" + (tab === "connect" ? " on" : "")} id="wm-panel-connect">
          <div className="wm-cols">
            <button id="wifi-host" type="button" onClick={host}>🖥️ Host a session</button>
            <button id="wifi-join" type="button" onClick={() => { setHostArea(false); setJoinArea(true); st("Paste the host's code below, then generate your answer.", "ok"); }}>🔗 Join with a code</button>
          </div>
          <div className={"wm-status" + (status.kind ? " " + status.kind : "")} id="wifi-status">{status.msg}</div>
          <div id="wifi-host-area" style={{ display: hostArea ? "block" : "none" }}>
            <div className="wm-row"><label>Your code</label><textarea id="wifi-offer-out" readOnly value={offerOut}></textarea></div>
            <div className="wm-row"><label>Paste their answer</label><textarea id="wifi-answer-in" placeholder="Paste the code the other player gives you here…" value={answerIn} onChange={(e) => setAnswerIn(e.target.value)}></textarea></div>
            <button className="type-btn" id="wifi-apply-answer" type="button" onClick={applyAnswer}>Connect</button>
          </div>
          <div id="wifi-join-area" style={{ display: joinArea ? "block" : "none" }}>
            <div className="wm-row"><label>Paste host code</label><textarea id="wifi-offer-in" placeholder="Paste the host's code here…" value={offerIn} onChange={(e) => setOfferIn(e.target.value)}></textarea></div>
            <button className="type-btn" id="wifi-make-answer" type="button" onClick={makeAnswer}>Generate my answer</button>
            <div className="wm-row" style={{ marginTop: 10 }}><label>Your answer</label><textarea id="wifi-answer-out" readOnly value={answerOut}></textarea></div>
          </div>
        </div>
        <div className={"wm-panel" + (tab === "share" ? " on" : "")} id="wm-panel-share">
          <p className="wm-sub" style={{ margin: "0 0 10px" }}>Export your leaderboard as a short code, or paste a friend's code to merge their scores in.</p>
          <div className="wm-row"><label>Your code</label><textarea id="wifi-share-out" readOnly ref={shareRef} value={on ? shareOut() : ""}></textarea></div>
          <button className="type-btn" id="wifi-copy-share" type="button" onClick={() => { const v = shareRef.current!; v.select(); try { document.execCommand("copy"); } catch { /* ignore */ } st("Copied your leaderboard code.", "ok"); }}>Copy</button>
          <div className="wm-row" style={{ marginTop: 10 }}><label>Paste friend's</label><textarea id="wifi-share-in" placeholder="Paste a friend's leaderboard code here…" value={shareIn} onChange={(e) => setShareIn(e.target.value)}></textarea></div>
          <button className="type-btn" id="wifi-merge-share" type="button" onClick={() => merge(shareIn)}>Merge their scores</button>
        </div>
        <div className="wm-lb" id="wifi-leaderboard">
          <h4>🏆 Shared leaderboard</h4>
          <ol id="wifi-lb-list">
            {lbRows.length ? lbRows.map((r, i) => <li key={i}><b>{r.name}</b> — {r.score}</li>) : <li>No players connected yet.</li>}
          </ol>
        </div>
        <div className="wm-close"><button className="type-btn ghost" id="wifi-close" type="button" onClick={() => wifiOpen.set(false)}>Close</button></div>
      </div>
      <div className="wm-quick" id="wm-quick-wrap">
        <h4>⚡ Quick Code</h4>
        <p>Type a short room word (like <b>Mustang</b>) and a classroom hub address. Both players on the same Wi-Fi enter the same word to connect instantly. Requires a hub running on the teacher's computer — short codes cannot work without one.</p>
        <input type="text" id="wm-room" placeholder="Room code (e.g. Mustang)" autoComplete="off" value={room} onChange={(e) => setRoom(e.target.value)} />
        <input type="text" id="wm-hub" placeholder="Classroom hub address (e.g. http://192.168.1.10:8080)" value={hub} onChange={(e) => setHub(e.target.value)} />
        <div className="g519-btnrow"><button className="type-btn" id="wm-quick-go" onClick={quickGo}>Connect with room code</button></div>
        <p className="g519-sub" id="wm-quick-status" style={{ marginTop: 8 }}>{quick}</p>
      </div>
    </div>
  );
}
