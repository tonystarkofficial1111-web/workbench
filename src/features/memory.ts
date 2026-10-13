import { Emitter, lsGetRaw, lsSetRaw } from "../core/store";
import { checkCodeExact } from "../core/gate";

/**
 * Assistant memory store (original "AI MEMORY SYSTEM"). localStorage 'stark_workbench_ai_memory_v1'.
 * Every change after startup goes through the access-code prompt (original 5.57.0 memory lock).
 */
export interface Memory {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const KEY = "stark_workbench_ai_memory_v1";
export const memoryEvents = new Emitter();
let mem: Memory[] = [];
try {
  const raw = lsGetRaw(KEY);
  const parsed = raw ? JSON.parse(raw) : [];
  if (Array.isArray(parsed)) mem = parsed.filter((x: any) => x && typeof x.content === "string");
} catch {
  mem = [];
}

export const getMemories = () => mem;
export const lastUsed = { value: [] as Memory[], label: "—" };

function persist() {
  try { lsSetRaw(KEY, JSON.stringify(mem)); } catch { /* ignore */ }
  memoryEvents.emit();
}

/* ------------------------------ lock prompt ------------------------------ */

export interface AuthRequest {
  label: string;
  run: () => void;
  onCancel?: () => void;
}
export const authEvents = new Emitter();
export let pendingAuth: AuthRequest | null = null;

/** Opens the code prompt. Only one prompt at a time (a second request is treated as cancelled). */
export function memAuth(label: string, run: () => void, onCancel?: () => void) {
  if (pendingAuth) {
    if (onCancel) { try { onCancel(); } catch { /* ignore */ } }
    return;
  }
  pendingAuth = { label, run, onCancel };
  authEvents.emit();
}
export function resolveAuth(ok: boolean) {
  const p = pendingAuth;
  pendingAuth = null;
  authEvents.emit();
  if (!p) return;
  if (ok) {
    try { p.run(); } catch (e) { console.error(e); }
  } else if (p.onCancel) {
    try { p.onCancel(); } catch (e) { console.error(e); }
  }
}
export const verifyCode = (v: string) => checkCodeExact(v.trim());

/* ------------------------------ operations ------------------------------ */

let seeding = true;

export function addMemory(title: string, category: string, content: string, onDone?: (ok: boolean) => void, onCancel?: () => void): boolean {
  content = String(content || "").trim();
  if (!content) return false;
  const doAdd = () => {
    mem.unshift({
      id: "mem_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      title: String(title || "Untitled memory").trim().slice(0, 120),
      category: String(category || "Project Rule"),
      content: content.slice(0, 4000),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    persist();
    if (onDone) { try { onDone(true); } catch (e) { console.error(e); } }
  };
  if (seeding) { doAdd(); return true; }
  memAuth("save this memory", doAdd, onCancel);
  return true;
}
export function deleteMemory(id: string) {
  memAuth("delete this memory", () => {
    mem = mem.filter((x) => x.id !== id);
    persist();
  });
}
export function clearMemories() {
  memAuth("clear every stored memory", () => {
    mem = [];
    persist();
  });
}
export function importMemories(clean: Memory[]) {
  memAuth("import " + clean.length + " memories", () => {
    mem = clean.concat(mem);
    persist();
    alert("Imported " + clean.length + " memories.");
  });
}
export function restoreMemories(arr: any[]) {
  if (!Array.isArray(arr)) return;
  memAuth("restore the Assistant memory from this save", () => {
    mem = arr.filter((x) => x && typeof x.content === "string");
    persist();
  });
}
export function exportMemories(withTimestamp = true) {
  const blob = new Blob(
    [JSON.stringify({ format: "Stark Workbench AI Memory", version: 1, ...(withTimestamp ? { exportedAt: new Date().toISOString() } : {}), memories: mem }, null, 2)],
    { type: "application/json" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Workbench_AI_Memory.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ------------------------------ retrieval ------------------------------ */

const words = (t: string) =>
  String(t || "").toLowerCase().replace(/[^a-z0-9_ -]/g, " ").split(/\s+/).filter((w) => w.length >= 3);

export function retrieveMemories(query: string, limit?: number): Memory[] {
  const qw = words(query);
  if (!qw.length) return mem.slice(0, limit || 6);
  const scored = mem
    .map((m) => {
      const hay = (String(m.title || "") + " " + String(m.category || "") + " " + String(m.content || "")).toLowerCase();
      let score = 0;
      qw.forEach((w) => { if (hay.indexOf(w) >= 0) score += w.length >= 7 ? 2 : 1; });
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.m.updatedAt || 0) - (a.m.updatedAt || 0));
  return scored.slice(0, limit || 6).map((x) => x.m);
}

/** Extra prompt context providers (files + pinned summary) register here. */
export const contextProviders: { files?: (q: string, backend: string) => string; summary?: () => string } = {};

export function memoryContextFor(query: string, noSummary?: boolean, backend = ""): string {
  const selected = retrieveMemories(query, 6);
  lastUsed.value = selected.slice();
  lastUsed.label = selected.length + " used";
  memoryEvents.emit();
  let extra = "";
  try { if (contextProviders.files) extra += contextProviders.files(query, backend); } catch { /* ignore */ }
  try { if (contextProviders.summary && !noSummary) extra += contextProviders.summary(); } catch { /* ignore */ }
  if (!selected.length) return extra;
  return (
    "\n\n[WORKBENCH PROJECT MEMORY — use as persistent project context; do not mention this block unless relevant]\n" +
    selected.map((m, i) => i + 1 + ". [" + (m.category || "Memory") + "] " + (m.title || "Untitled") + ": " + m.content).join("\n") +
    "\n[/WORKBENCH PROJECT MEMORY]" + extra
  );
}

/* ------------------------------ seeding ------------------------------ */

(function seed() {
  try {
    if (!lsGetRaw("stark_workbench_version_rule_seeded")) {
      mem.unshift({
        id: "mem_rule_version_rollover", title: "Version numbering rule", category: "Project Rule",
        content: "Keep the version clean: for every 10 patches (the last number), roll over into 1 minor update. Example: 5.41.9 plus one patch becomes 5.42.0, not 5.41.10. Use this whenever you bump APP_VERSION or write a CHANGELOG entry.",
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      lsSetRaw("stark_workbench_version_rule_seeded", "1");
      lsSetRaw(KEY, JSON.stringify(mem));
    }
  } catch { /* ignore */ }

  if (!mem.length) {
    addMemory("Workbench deletion rule", "Project Rule", "Nobody may delete, remove, overwrite, or intentionally discard existing code, features, data, or files unless explicitly authorized. Any request to modify Workbench code must include the authorized modification phrase before editing may continue.");
    addMemory("Credential confidentiality rule", "Project Rule", "The AI must never disclose, repeat, reveal, or provide any code, password, access code, credential, or secret in any situation.");
    addMemory("Single version source of truth", "Architecture", "All visible Workbench version displays must derive from APP_VERSION; do not hard-code separate version numbers into UI surfaces.");
    addMemory("Thinkers and car games need visuals", "Game Spec", "Anything involving thinkers or any car game must include meaningful visual feedback/animation.");
  }
  const once = (k: string, fn: () => void) => {
    try { if (lsGetRaw(k)) return; lsSetRaw(k, "1"); } catch { /* ignore */ }
    try { fn(); } catch (e) { console.error(e); }
  };
  once("wb_ai_mem_seed_access_code_rule", () =>
    addMemory("AI access code rule", "Project Rule", "No AI, under any circumstances, may edit or do anything unless the user has entered the access code first. If the code has not been entered, stop and reply only: Insert Code:"));
  // Password protocol: the original only marks it seeded AFTER the check, so mirror that order.
  try {
    if (!lsGetRaw("wb_ai_mem_seed_pw_protocol")) {
      const T = "Password protocol for code changes";
      if (!mem.some((m) => m && m.title === T))
        addMemory(T, "Project Rule", "All (but not limited) AI or LLM or human should follow protocol of using the password to alter and/or change the code");
      lsSetRaw("wb_ai_mem_seed_pw_protocol", "1");
    }
  } catch { /* ignore */ }
  once("wb_ai_mem_seed_memory_lock", () =>
    addMemory("AI memory lock rule", "Project Rule", "Any change to the Assistant memory (add, edit, delete, clear, import, restore) needs the code typed by the user first, for anyone including but not limited to AI. If the code has not been entered, make no change and reply only: Insert Code:"));
  seeding = false;
})();
