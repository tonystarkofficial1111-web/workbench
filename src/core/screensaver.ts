import { Emitter, lsGetRaw, lsSetRaw } from "./store";
import AFK_GTD from "../assets/afk-gtd.b64";
import AFK_X from "../assets/afk-x.b64";

/** AFK screensaver (original window.wbScreensaver). Both clips are embedded as base64 and decoded on demand. */
export type ClipName = "gtd" | "x";
export const ssEvents = new Emitter();

const DB_NAME = "WorkbenchScreensaverCache";
const DB_VERSION = 1;
const STORE = "clips";

let afkDelay = 120000;
let lastActivity = Date.now();
let afkActive = false;
let enabled = true;
let afkGrace = 0;
let clip: ClipName = "x";
const clipUrls: Partial<Record<ClipName, string>> = {};
let db: IDBDatabase | null = null;
export const ssView = { active: false, clipSrc: "", clipName: "x" as ClipName, downloadStatus: "Save both clips to this browser before going to a restricted network.", downloading: false };

try {
  const saved = lsGetRaw("wb_ss_clip");
  if (saved === "gtd" || saved === "x") clip = saved;
  enabled = lsGetRaw("wb_ss_enabled") !== "0";
  let m = parseInt(lsGetRaw("wb_ss_delay_min") || "2", 10);
  if (!isFinite(m)) m = 2;
  afkDelay = m * 60000;
} catch { /* ignore */ }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        db = req.result;
        resolve(db);
      };
      req.onerror = () => reject(req.error || new Error("Could not open local cache"));
    } catch (e) {
      reject(e);
    }
  });
}
const getCached = (name: ClipName) =>
  openDb().then(
    (d) =>
      new Promise<Blob | null>((resolve, reject) => {
        const req = d.transaction(STORE, "readonly").objectStore(STORE).get(name);
        req.onsuccess = () => resolve((req.result as Blob) || null);
        req.onerror = () => reject(req.error);
      }),
  );
const putCached = (name: ClipName, blob: Blob) =>
  openDb().then(
    (d) =>
      new Promise<boolean>((resolve, reject) => {
        const tx = d.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(blob, name);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error("Could not save clip"));
      }),
  );

/** Hand-rolled base64 decode (the original avoided atob/btoa on purpose). */
function base64Blob(name: ClipName): Blob {
  const b64 = name === "gtd" ? AFK_GTD : AFK_X;
  const tbl: Record<string, number> = {};
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let k = 0; k < 64; k++) tbl[chars.charAt(k)] = k;
  const len = b64.length;
  const pad = (b64.charAt(len - 1) === "=" ? 1 : 0) + (b64.charAt(len - 2) === "=" ? 1 : 0);
  const out = new Uint8Array((len / 4) * 3 - pad);
  let p = 0;
  for (let k = 0; k < len; k += 4) {
    const a = tbl[b64.charAt(k)]!;
    const b = tbl[b64.charAt(k + 1)]!;
    const c = tbl[b64.charAt(k + 2)] || 0;
    const d = tbl[b64.charAt(k + 3)] || 0;
    if (p < out.length) out[p++] = (a << 2) | (b >> 4);
    if (p < out.length) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < out.length) out[p++] = ((c & 3) << 6) | d;
  }
  return new Blob([out], { type: "video/mp4" });
}
function clipUrl(name: ClipName): string {
  if (clipUrls[name]) return clipUrls[name]!;
  try {
    clipUrls[name] = URL.createObjectURL(base64Blob(name));
  } catch {
    clipUrls[name] = "data:video/mp4;base64," + (name === "gtd" ? AFK_GTD : AFK_X);
  }
  return clipUrls[name]!;
}
function restoreCached() {
  (["gtd", "x"] as ClipName[]).forEach((name) => {
    getCached(name)
      .then((blob) => {
        if (blob) {
          if (clipUrls[name]) {
            try { URL.revokeObjectURL(clipUrls[name]!); } catch { /* ignore */ }
          }
          clipUrls[name] = URL.createObjectURL(blob);
        }
      })
      .catch(() => {});
  });
}

function show() {
  ssView.clipName = clip;
  ssView.clipSrc = clipUrl(clip);
  ssView.active = true;
  afkActive = true;
  ssEvents.emit();
}
function resetTimer() {
  if (Date.now() < afkGrace) return;
  lastActivity = Date.now();
  if (afkActive) {
    afkActive = false;
    ssView.active = false;
    ssEvents.emit();
  }
}
function checkAfk() {
  if (enabled && !afkActive && Date.now() - lastActivity > afkDelay) show();
}

let started = false;
export function startScreensaver() {
  if (started) return;
  started = true;
  (["mousemove", "keydown", "click", "touchstart", "wheel"] as const).forEach((evt) =>
    document.addEventListener(evt, resetTimer, { passive: true }),
  );
  setInterval(checkAfk, 5000);
  restoreCached();
}

export const wbScreensaver = {
  isEnabled: () => enabled,
  delayMin: () => {
    const min = Math.round(afkDelay / 60000);
    return [1, 2, 5, 10, 20, 30, 60].includes(min) ? min : 2;
  },
  getClip: () => clip,
  setEnabled(v: boolean) {
    enabled = !!v;
    lsSetRaw("wb_ss_enabled", enabled ? "1" : "0");
    resetTimer();
    ssEvents.emit();
  },
  setDelay(min: string | number) {
    let n = parseInt(String(min), 10);
    if (!isFinite(n)) n = 2;
    afkDelay = n * 60000;
    lsSetRaw("wb_ss_delay_min", String(n));
    resetTimer();
    ssEvents.emit();
  },
  setClip(name: ClipName) {
    if (name !== "gtd" && name !== "x") return;
    clip = name;
    lsSetRaw("wb_ss_clip", clip);
    ssEvents.emit();
  },
  preview() {
    afkGrace = Date.now() + 1500;
    show();
  },
  prepareOffline() {
    ssView.downloading = true;
    ssView.downloadStatus = "Saving the two reduced-quality clips to this device…";
    ssEvents.emit();
    Promise.all(
      (["gtd", "x"] as ClipName[]).map((name) =>
        getCached(name).then((existing) => (existing ? true : putCached(name, base64Blob(name)))),
      ),
    )
      .then(() => {
        ssView.downloadStatus = "Offline copies ready. You can switch to school WiFi and the screensaver will keep working.";
        restoreCached();
      })
      .catch((err) => {
        ssView.downloadStatus = "Could not save offline copies: " + (err && err.message ? err.message : "browser storage unavailable");
      })
      .finally(() => {
        ssView.downloading = false;
        ssEvents.emit();
      });
  },
};
