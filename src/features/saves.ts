import { Value, storeLock } from "../core/store";
import { worldBridge } from "../core/bridge";
import { downloadBlob, replaceProfile, sanitizeImportedProfile, saveProfile } from "../core/profile";
import { vFmt, vGetAll, vPut } from "../media/videoDb";
import { markBackup } from "./shop";
import { APP_VERSION } from "../version";

/**
 * The two kinds of save the app can write, and the one reader that understands every file it has ever written.
 *
 *   Block World  = the island (blocks, trees, farms, houses, villagers, inventory, camera) + the Block World's own saved numbers.
 *   User saves   = everything else this app keeps in the browser: profile and scores, shop, theme, notes, flashcards, study data,
 *                  AI memory and chat, My Files, badges, daily challenge, settings, F1 settings, saved keys and the video library.
 *
 * Every save button opens the chooser (components/SaveChooser.tsx) first; the Block World's Save button and the User / Saves tab all go there.
 */

export type SaveKind = "block-world" | "user";

export const USER_FORMAT = "Stark Workbench User Saves";
export const BLOCK_WORLD_FORMAT = "Stark Workbench Block World Save";
const LEGACY_FULL = "Stark Workbench Full Backup";
const LEGACY_COMPLETE = "Stark Workbench Complete Save";
/** A User saves file that carries videos is binary: this header, a 4-byte manifest length, the manifest (JSON), then each video's bytes. */
const MAGIC = "WBUSERSAVE1\n";
const MAGIC_BYTES = new TextEncoder().encode(MAGIC);
const HEAD = MAGIC_BYTES.length + 4;

/** Keys the Block World itself writes (rare-ore bank, best wave, Infinite day, most defenses built, its graphics level). They travel with the Block World save and are left out of User saves. */
export const BLOCK_WORLD_KEYS = ["wb-rare-bank", "wb-inf-best", "wb-inf-day", "wb-bw-maxdefs", "wb-inf-gfx", "wb-freestyle-v1"];
export const isBlockWorldKey = (k: string) => BLOCK_WORLD_KEYS.indexOf(k) >= 0;
/** Everything this app stores starts with one of these; other pages on the same origin (file:// is one origin) are never touched. */
const isAppKey = (k: string) => /^(wb[-_]|stark_)/.test(k);

function allKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) out.push(k);
    }
  } catch { /* storage blocked */ }
  return out;
}
function pick(keep: (k: string) => boolean): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of allKeys()) {
    if (!keep(k)) continue;
    try {
      const v = localStorage.getItem(k);
      if (v !== null) o[k] = v;
    } catch { /* skip */ }
  }
  return o;
}
export const userStorage = () => pick((k) => isAppKey(k) && !isBlockWorldKey(k));
export const blockWorldStorage = () => pick(isBlockWorldKey);
export function restoreBlockWorldStorage(st: any) {
  if (!st || typeof st !== "object") return;
  for (const k of BLOCK_WORLD_KEYS) {
    if (typeof st[k] !== "string") continue;
    try { localStorage.setItem(k, st[k]); } catch { /* quota */ }
  }
}

/* ------------------------------- chooser state ------------------------------- */

export const saveChooser = new Value<boolean>(false);
export const openSaveChooser = () => saveChooser.set(true);
export const closeSaveChooser = () => saveChooser.set(false);

export async function videoSummary(): Promise<{ count: number; bytes: number }> {
  try {
    const all = await vGetAll();
    return { count: all.length, bytes: all.reduce((n, v) => n + (v.size || (v.blob && v.blob.size) || 0), 0) };
  } catch {
    return { count: 0, bytes: 0 };
  }
}

/* ---------------------------------- export ---------------------------------- */

const today = () => new Date().toISOString().slice(0, 10);

/** Block World only: the island and the Block World's own saved numbers. */
export function exportBlockWorld(): string {
  worldBridge.exportBundle();
  return "Block World saved — check your downloads.";
}

/** User saves: everything except the Block World. With `withVideos` the video library rides along (the file is then a .wbsave container). */
export async function exportUserSaves(withVideos: boolean): Promise<string> {
  saveProfile();                                            // the profile is written every 5 s; make sure the very latest is in the file
  const storage = userStorage();
  let videos: Awaited<ReturnType<typeof vGetAll>> = [];
  if (withVideos) {
    try { videos = await vGetAll(); } catch { videos = []; }
  }
  const manifest = {
    format: USER_FORMAT,
    version: 2,
    appVersion: APP_VERSION,
    savedAt: new Date().toISOString(),
    notIncluded: "Block World",
    storage,
    videos: videos.map((v) => ({ name: v.name, size: v.size, type: v.type, added: v.added, length: v.blob.size })),
  };
  const items = Object.keys(storage).length;
  if (!videos.length) {
    downloadBlob("workbench-user-saves-" + today() + ".json", new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }));
    markBackup();
    return "User saves exported (" + items + " saved items) — check your downloads.";
  }
  const body = new TextEncoder().encode(JSON.stringify(manifest));
  const head = new Uint8Array(HEAD + body.length);
  head.set(MAGIC_BYTES, 0);
  new DataView(head.buffer).setUint32(MAGIC_BYTES.length, body.length);
  head.set(body, HEAD);
  downloadBlob("workbench-user-saves-" + today() + ".wbsave", new Blob([head, ...videos.map((v) => v.blob)], { type: "application/octet-stream" }));
  markBackup();
  const bytes = videos.reduce((n, v) => n + v.blob.size, 0);
  return "User saves exported (" + items + " saved items and " + videos.length + " video" + (videos.length === 1 ? "" : "s") + ", " + vFmt(bytes) + " of video) — check your downloads.";
}

/* ---------------------------------- import ---------------------------------- */

export interface ImportResult { ok: boolean; msg: string }
const fail = (msg: string): ImportResult => ({ ok: false, msg });

async function readContainer(file: File): Promise<{ manifest: any; videos: Blob[] } | null> {
  if (file.size < HEAD) return null;
  const head = new Uint8Array(await file.slice(0, HEAD).arrayBuffer());
  for (let i = 0; i < MAGIC_BYTES.length; i++) if (head[i] !== MAGIC_BYTES[i]) return null;
  const len = new DataView(head.buffer).getUint32(MAGIC_BYTES.length);
  if (!len || HEAD + len > file.size) throw new Error("damaged");
  const manifest = JSON.parse(await file.slice(HEAD, HEAD + len).text());
  let off = HEAD + len;
  const videos: Blob[] = [];
  for (const v of manifest.videos || []) {
    const n = +v.length || 0;
    if (off + n > file.size) throw new Error("damaged");
    videos.push(file.slice(off, off + n, v.type || "video/mp4"));
    off += n;
  }
  return { manifest, videos };
}

/** Reads any file the app has ever saved and puts it back where it belongs. Block World files go to the world; progress files to the profile; User saves restore settings and videos, then reload. */
export async function importSave(file: File): Promise<ImportResult> {
  let manifest: any;
  let videos: Blob[] = [];
  try {
    const box = await readContainer(file);
    if (box) ({ manifest, videos } = box);
    else {
      if (file.size > 64 * 1048576) return fail("That file is too large to be a Workbench save.");
      manifest = JSON.parse(await file.text());
    }
  } catch {
    return fail("Could not read that file — it is not a Workbench save.");
  }
  if (!manifest || typeof manifest !== "object") return fail("Could not read that file — it is not a Workbench save.");

  // The Block World (its own file, a Complete Save from before, or a bare world).
  if (manifest.format === BLOCK_WORLD_FORMAT || manifest.format === LEGACY_COMPLETE || Array.isArray(manifest.blocks)) {
    try {
      worldBridge.importData(manifest);
    } catch (e: any) {
      return fail("Could not read that Block World file: " + (e && e.message ? e.message : e));
    }
    return { ok: true, msg: "World loaded." };
  }

  // Arcade progress from the old "Export progress" button.
  if (manifest.format === undefined && manifest.arcade && manifest.arcade.rooftopRumble) {
    const res = sanitizeImportedProfile(manifest);
    if (!res.ok) return fail(res.error);
    replaceProfile(res.profile);
    return { ok: true, msg: "Logged in — welcome back, " + res.profile.name + ". Record restored." };
  }

  // User saves (JSON or container) and the 5.46 full backup.
  const isUser = manifest.format === USER_FORMAT, isFull = manifest.format === LEGACY_FULL;
  if ((isUser || isFull) && manifest.storage && typeof manifest.storage === "object") {
    const storage: Record<string, string> = {};
    for (const k of Object.keys(manifest.storage)) {
      const v = manifest.storage[k];
      if (typeof v !== "string" || !isAppKey(k)) continue;
      if (isUser && isBlockWorldKey(k)) continue;           // a User saves file never carries the Block World, whatever it says
      storage[k] = v;
    }
    const n = Object.keys(storage).length;
    const vm: any[] = Array.isArray(manifest.videos) ? manifest.videos : [];
    const when = manifest.savedAt ? " saved " + new Date(manifest.savedAt).toLocaleString() : "";
    const ask =
      "Restore " + n + " saved item" + (n === 1 ? "" : "s") + (vm.length ? " and " + vm.length + " video" + (vm.length === 1 ? "" : "s") : "") +
      " from this " + (isUser ? "User saves" : "full backup") + " file" + when + "?\n\nMatching items on this device will be overwritten." +
      (isUser ? " Your Block World is not touched." : " This older file also carries the Block World's saved numbers.");
    if (!confirm(ask)) return fail("Restore cancelled.");
    storeLock.on = true;                                    // nothing else may write until the page reloads
    let failed = 0;
    for (const k of Object.keys(storage)) {
      try { localStorage.setItem(k, storage[k]!); } catch { failed++; }
    }
    let added = 0, skipped = 0, unsaved = 0;
    if (videos.length) {
      let have = new Set<string>();
      try { have = new Set((await vGetAll()).map((v) => v.name + "|" + v.size + "|" + v.added)); } catch { /* start empty */ }
      for (let i = 0; i < videos.length; i++) {
        const m = vm[i] || {};
        const key = m.name + "|" + m.size + "|" + m.added;
        if (have.has(key)) { skipped++; continue; }
        try {
          await vPut({ name: String(m.name || "video"), size: +m.size || videos[i]!.size, type: m.type || "video/mp4", added: +m.added || Date.now(), blob: videos[i]! });
          added++;
        } catch { unsaved++; }
      }
    }
    setTimeout(() => location.reload(), 1200);
    const bits = ["Restored " + (n - failed) + " saved item" + (n - failed === 1 ? "" : "s")];
    if (added) bits.push(added + " video" + (added === 1 ? "" : "s"));
    if (skipped) bits.push(skipped + " already here");
    const problems = (failed ? failed + " item" + (failed === 1 ? "" : "s") + " did not fit in browser storage" : "") + (unsaved ? (failed ? ", " : "") + unsaved + " video" + (unsaved === 1 ? "" : "s") + " did not fit" : "");
    return { ok: failed + unsaved === 0, msg: bits.join(" · ") + (problems ? " (" + problems + ")" : "") + " — reloading…" };
  }

  return fail("That file is not a Workbench save (Block World, User saves or progress).");
}
