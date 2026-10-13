import { Emitter, lsGetRaw, lsSetRaw, lsRemove } from "../core/store";

/** Online video helpers (original 5.54.0 module): search backends, watch-later/history lists, stream lookup. */
export interface Vid { id: string; title?: string; by?: string; meta?: string; dur?: string; t?: number }
export const ytEvents = new Emitter();

export const KEY_LS = "wb_yt_api_key";
export const LATER_LS = "wb_yt_later";
export const HIST_LS = "wb_yt_hist";
const LATER_MAX = 200, HIST_MAX = 60;

export const INV = ["https://inv.nadeko.net", "https://invidious.nerdvpn.de", "https://yt.chocolatemoo53.com", "https://invidious.tiekoetter.com", "https://invidious.f5.si"];
export const st = { goodInst: "", bad: {} as Record<string, 1>, altIdx: 0 };

/** Refresh the server list from the Invidious directory (best effort). */
export function refreshInstances() {
  fetch("https://api.invidious.io/instances.json?sort_by=type,health")
    .then((r) => r.json())
    .then((a) => {
      (a || []).forEach((e: any) => {
        const m = e && e[1];
        if (m && m.api === true && m.type === "https" && m.cors !== false && /^https:\/\/[\w.-]+$/.test(m.uri || "") && INV.indexOf(m.uri) < 0 && INV.length < 14) INV.push(m.uri);
      });
    })
    .catch(() => {});
}

export const getKey = () => (lsGetRaw(KEY_LS) || "").trim();
export const setKey = (v: string) => lsSetRaw(KEY_LS, v);
export const clearKey = () => lsRemove(KEY_LS);

export function decode(s: any): string {
  try { return new DOMParser().parseFromString(String(s || ""), "text/html").documentElement.textContent || ""; } catch { return String(s || ""); }
}
export function ago(iso: string): string {
  const t = Date.parse(iso);
  if (!t) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  const u: [number, string][] = [[31536000, "year"], [2592000, "month"], [604800, "week"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  for (const [d, n] of u) if (s >= d) { const k = Math.floor(s / d); return k + " " + n + (k > 1 ? "s" : "") + " ago"; }
  return "just now";
}
export const agoMs = (t: number) => { try { return ago(new Date(t).toISOString()); } catch { return ""; } };
export function dur(sec: any): string {
  sec = +sec || 0;
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s;
}
export function parseId(s: string): string | null {
  const m = String(s || "").trim().match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/i);
  return m ? m[1]! : null;
}

export async function apiSearch(q: string, token: string | null) {
  const u = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=24&videoEmbeddable=true&q=" + encodeURIComponent(q) +
    (token ? "&pageToken=" + encodeURIComponent(token) : "") + "&key=" + encodeURIComponent(getKey());
  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) {
    const er = j && j.error;
    const reason = (er && er.errors && er.errors[0] && er.errors[0].reason) || (er && er.status) || "error";
    const e: any = new Error(reason);
    e.reason = reason;
    throw e;
  }
  return {
    items: (j.items || [])
      .filter((i: any) => i.id && /^[\w-]{11}$/.test(i.id.videoId || ""))
      .map((i: any): Vid => ({ id: i.id.videoId, title: decode(i.snippet.title), by: decode(i.snippet.channelTitle), meta: ago(i.snippet.publishedAt) })),
    next: (j.nextPageToken || null) as string | number | null,
  };
}
export async function invSearch(q: string, page: number, i = 0): Promise<{ items: Vid[]; next: string | number | null }> {
  if (i >= Math.min(INV.length, 8)) throw new Error("inv");
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 6000);
  try {
    const r = await fetch(INV[i] + "/api/v1/search?type=video&q=" + encodeURIComponent(q) + "&page=" + page, { signal: c.signal });
    clearTimeout(t);
    if (!r.ok) throw 0;
    const a = await r.json();
    if (!Array.isArray(a) || !a.length) throw 0;
    const items: Vid[] = a
      .filter((v: any) => v && v.type === "video" && /^[\w-]{11}$/.test(v.videoId || ""))
      .map((v: any) => ({ id: v.videoId, title: String(v.title || ""), by: String(v.author || ""), meta: [v.viewCountText, v.publishedText].filter(Boolean).join(" · "), dur: dur(v.lengthSeconds) }));
    if (!items.length) throw 0;
    st.goodInst = INV[i]!;
    return { items, next: page + 1 };
  } catch {
    clearTimeout(t);
    return invSearch(q, page, i + 1);
  }
}
export function apiMessage(reason: string): string {
  if (reason === "quotaExceeded" || reason === "dailyLimitExceeded" || reason === "rateLimitExceeded") return "Today's free YouTube search quota is used up (it resets daily).";
  if (reason === "keyInvalid" || reason === "INVALID_ARGUMENT") return "YouTube rejected that API key. Check it in Search settings.";
  if (reason === "accessNotConfigured" || reason === "forbidden" || reason === "PERMISSION_DENIED" || reason === "ipRefererBlocked") return "That key isn't allowed to use YouTube Data API v3. Enable it for the key in Google Cloud (and remove any website restrictions).";
  return "YouTube search failed (" + reason + ").";
}

/* ---------------------------- saved lists ---------------------------- */
export function loadList(k: string): Vid[] {
  try {
    const a = JSON.parse(lsGetRaw(k) || "[]");
    return Array.isArray(a) ? a.filter((v) => v && /^[\w-]{11}$/.test(v.id || "")) : [];
  } catch { return []; }
}
export function saveList(k: string, a: Vid[]) {
  const ok = lsSetRaw(k, JSON.stringify(a));
  ytEvents.emit();
  return ok;
}
export const inList = (k: string, id: string) => loadList(k).some((v) => v.id === id);
export function addLater(v: Vid) {
  const a = loadList(LATER_LS).filter((x) => x.id !== v.id);
  a.unshift({ id: v.id, title: v.title || "", by: v.by || "", t: Date.now() });
  return saveList(LATER_LS, a.slice(0, LATER_MAX));
}
export const delFrom = (k: string, id: string) => saveList(k, loadList(k).filter((x) => x.id !== id));
export function touchHist(id: string, title?: string, by?: string) {
  let old: Vid | null = null;
  const a = loadList(HIST_LS).filter((x) => { if (x.id === id) { old = x; return false; } return true; });
  a.unshift({ id, title: title || (old && (old as Vid).title) || "", by: by || (old && (old as Vid).by) || "", t: Date.now() });
  saveList(HIST_LS, a.slice(0, HIST_MAX));
}
export function fillTitle(id: string, title: string, by?: string) {
  if (!title) return;
  [LATER_LS, HIST_LS].forEach((k) => {
    const a = loadList(k);
    let ch = false;
    a.forEach((x) => { if (x.id === id && !x.title) { x.title = title; x.by = by || ""; ch = true; } });
    if (ch) saveList(k, a);
  });
}

/* ---------------------------- stream lookup ---------------------------- */
export interface StreamInfo { inst: string; title: string; by: string; streams: { url: string; h: number; label: string }[]; hls: string }
export async function fetchInfo(inst: string, id: string): Promise<StreamInfo> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 9000);
  try {
    const r = await fetch(inst + "/api/v1/videos/" + id + "?local=true&fields=title,author,hlsUrl,formatStreams", { signal: c.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error("http");
    const j = await r.json();
    const out: StreamInfo["streams"] = [];
    (j.formatStreams || []).forEach((f: any) => {
      let u = String(f.url || "");
      if (u.charAt(0) === "/") u = inst + u;
      if (!/^https:\/\//i.test(u)) return;
      const ct = String(f.container || f.type || "");
      if (ct && !/mp4|webm/i.test(ct)) return;
      out.push({ url: u, h: parseInt(f.qualityLabel || f.quality || "", 10) || 0, label: String(f.qualityLabel || f.quality || "video") });
    });
    out.sort((a, b) => b.h - a.h);
    let hls = String(j.hlsUrl || "");
    if (hls.charAt(0) === "/") hls = inst + hls;
    if (!/^https:\/\//i.test(hls)) hls = "";
    if (!out.length && !hls) throw new Error("nostreams");
    return { inst, title: decode(j.title || ""), by: decode(j.author || ""), streams: out, hls };
  } catch (e) {
    clearTimeout(t);
    st.bad[inst] = 1;
    throw e;
  }
}
export function instOrder(): string[] {
  let l = INV.slice();
  if (st.goodInst && l.indexOf(st.goodInst) > -1) l = [st.goodInst].concat(l.filter((x) => x !== st.goodInst));
  let ok = l.filter((x) => !st.bad[x]);
  if (!ok.length) { st.bad = {}; ok = l; }
  return ok;
}

let apiP: Promise<void> | null = null;
export function loadYtApi(): Promise<void> {
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (apiP) return apiP;
  apiP = new Promise<void>((res, rej) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { try { if (prev) prev(); } catch { /* ignore */ } res(); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => { apiP = null; rej(new Error("api")); };
    document.head.appendChild(s);
    setTimeout(() => { if (!(w.YT && w.YT.Player)) { apiP = null; rej(new Error("timeout")); } }, 12000);
  });
  return apiP;
}
