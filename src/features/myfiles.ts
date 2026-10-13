import { Emitter, lsGet, lsSet } from "../core/store";
import { assistantBridge } from "../core/bridge";
import { MODEL_INFO, parseContextLimit, type BackendId } from "./assistantData";

/** Assistant "My files" (original 5.53.0): chunked local text search added to prompts. localStorage 'wb-myfiles-v1'. */
const FK = "wb-myfiles-v1", FSTAT = "wb-myfiles-stat";
const MAXFILE = 400000, MAXTOT = 1500000;
export const filesEvents = new Emitter();

export interface MyFile { id: string; name: string; size: number; addedAt: number; chunks: string[] }
export const STOP: Record<string, 1> = {};
"the and for are but not you all any can had her was one our out has his how its may new now old see two way who did get let put say she too use that with have this will your from they know want been were what when which their there about would these other into more some than them then also just like over such only very here make does should could where while after before because between during through".split(" ").forEach((w) => (STOP[w] = 1));
export const words = (t: string) =>
  (String(t || "").toLowerCase().match(/[a-z0-9][a-z0-9_-]{1,}/g) || [])
    .filter((w) => w.length >= 3 && !STOP[w])
    .map((w) => (w.length > 4 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w));
export const gist = (t: string, max: number) => {
  t = String(t || "").replace(/```[\s\S]*?```/g, " [code] ").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const p = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (p > max * 0.5) return cut.slice(0, p + 1);
  const s = cut.lastIndexOf(" ");
  return (s > max * 0.6 ? cut.slice(0, s) : cut) + "…";
};

export const getFiles = (): MyFile[] => {
  const a = lsGet<MyFile[]>(FK, []);
  return Array.isArray(a) ? a : [];
};

function chunkText(text: string): string[] {
  text = String(text).replace(/\r\n?/g, "\n").replace(/\u0000/g, "");
  const paras = text.split(/\n{2,}/), out: string[] = [];
  let cur = "", head = "";
  const flush = () => {
    const c = cur.trim();
    if (c) out.push((head && c.charAt(0) !== "#" ? "[" + head + "] " : "") + c);
    cur = "";
  };
  paras.forEach((p) => {
    p = p.trim();
    if (!p) return;
    const m = p.match(/^#{1,6}\s+(.+)/);
    if (m) { flush(); head = m[1]!.slice(0, 60); }
    const parts = p.length > 900 ? p.match(/[^.!?\n]+[.!?]*\s*/g) || [p] : [p];
    parts.forEach((s) => {
      if (cur.length + s.length > 650) flush();
      cur += (cur ? "\n" : "") + s;
      if (cur.length > 900) flush();
    });
  });
  flush();
  return out;
}

interface Idx { docs: { file: string; n: number; text: string; tf: Record<string, number>; len: number }[]; df: Record<string, number>; avg: number }
let idx: Idx | null = null;
function buildIdx(): Idx {
  if (idx) return idx;
  const docs: Idx["docs"] = [], df: Record<string, number> = {};
  let tl = 0;
  getFiles().forEach((f) => f.chunks.forEach((c, i) => {
    const w = words(c), tf: Record<string, number> = {};
    w.forEach((x) => (tf[x] = (tf[x] || 0) + 1));
    Object.keys(tf).forEach((x) => (df[x] = (df[x] || 0) + 1));
    docs.push({ file: f.name, n: i + 1, text: c, tf, len: w.length || 1 });
    tl += w.length || 1;
  }));
  idx = { docs, df, avg: docs.length ? tl / docs.length : 1 };
  return idx;
}
export function searchFiles(q: string, limit?: number) {
  const I = buildIdx();
  const seen: Record<string, 1> = {};
  const qw = words(q).filter((w) => (seen[w] ? false : (seen[w] = 1)));
  if (!qw.length || !I.docs.length) return [];
  const N = I.docs.length;
  const res: { file: string; n: number; text: string; score: number }[] = [];
  I.docs.forEach((d) => {
    let s = 0;
    qw.forEach((w) => {
      const f = d.tf[w];
      if (!f) return;
      const n = I.df[w] || 0, idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += (idf * (f * 2.2)) / (f + 1.2 * (0.25 + (0.75 * d.len) / I.avg));
    });
    if (s > 0) res.push({ file: d.file, n: d.n, text: d.text, score: s });
  });
  res.sort((a, b) => b.score - a.score);
  if (!res.length) return [];
  const top = res[0]!.score;
  return res.filter((r) => r.score >= top * 0.4).slice(0, limit || 3);
}

export const filesUsed: { value: { file: string; n: number; text: string }[] } = { value: [] };
const budgetFor = (b: string) => {
  const i = MODEL_INFO[(b || "") as BackendId];
  const l = i ? parseContextLimit(i.context) : null;
  return l ? Math.min(1400, Math.floor(l * 0.15)) : 1400;
};
export function filesContext(q: string, backend: string): string {
  filesUsed.value = [];
  const hits = searchFiles(q, 4);
  if (!hits.length) return "";
  let left = budgetFor(backend);
  const used: typeof filesUsed.value = [], lines: string[] = [];
  hits.forEach((h) => {
    let t = h.text, c = assistantBridge.tokens(t) + 12;
    if (c > left) {
      if (left < 90) return;
      t = t.slice(0, Math.max(120, (left - 12) * 4)).trim() + "…";
      c = left;
    }
    left -= c;
    used.push({ file: h.file, n: h.n, text: h.text });
    lines.push(used.length + ". " + h.file + " (part " + h.n + "): " + t);
  });
  filesUsed.value = used;
  if (!used.length) return "";
  return "\n\n[WORKBENCH MY FILES — passages from files the user added; use them when relevant and name the file you used]\n" + lines.join("\n") + "\n[/WORKBENCH MY FILES]";
}

/** Returns '' on success or a message describing why the file was rejected. */
export function addFile(name: string, text: string): string {
  text = String(text);
  if (text.length > MAXFILE) return "too big (" + Math.round(text.length / 1000) + " KB; limit " + Math.round(MAXFILE / 1000) + " KB)";
  if (/\u0000/.test(text.slice(0, 2000))) return "not a text file";
  const ch = chunkText(text);
  if (!ch.length) return "empty";
  const a = getFiles().filter((f) => f.name !== name);
  const tot = a.reduce((s, f) => s + f.size, 0) + text.length;
  if (tot > MAXTOT) return "would pass the " + Math.round(MAXTOT / 1000) + " KB total limit - remove a file first";
  a.unshift({ id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), name, size: text.length, addedAt: Date.now(), chunks: ch });
  if (!lsSet(FK, a)) return "browser storage is full";
  const st = lsGet(FSTAT, { added: 0 });
  st.added = (st.added || 0) + 1;
  lsSet(FSTAT, st);
  idx = null;
  filesEvents.emit();
  return "";
}
export function removeFile(id: string) {
  lsSet(FK, getFiles().filter((z) => z.id !== id));
  idx = null;
  filesEvents.emit();
}
export function removeAllFiles() {
  lsSet(FK, []);
  idx = null;
  filesEvents.emit();
}
