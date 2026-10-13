import { Emitter, lsGet, lsSet } from "../core/store";
import { assistantBridge } from "../core/bridge";
import { MODEL_INFO, parseContextLimit, type BackendId } from "./assistantData";
import { gist } from "./myfiles";

/** Auto-summary of older chat turns (original 5.53.0 "Idea 7"). */
const SCOUNT = "wb-summary-count";
export const summaryEvents = new Emitter();
let S = { lines: [] as string[], turns: 0, text: "" };
export const getSummary = () => S;

const tok = (t: string) => assistantBridge.tokens(t);
const limitFor = (b: string) => {
  const i = MODEL_INFO[b as BackendId];
  return i ? parseContextLimit(i.context) : null;
};
const sBudget = (limit: number) => Math.max(160, Math.floor(limit * 0.12));

function fit(limit: number) {
  const cap = sBudget(limit);
  let lines = S.lines;
  const t = () => tok(lines.join("\n"));
  if (t() > cap) lines = lines.map((l, i) => (i >= lines.length - 6 ? l : gist(l, 90)));
  let dropped = 0;
  while (t() > cap && lines.length > 4) { lines = lines.slice(1); dropped++; }
  if (dropped) lines = ["(…" + dropped + " even older lines dropped to keep room)"].concat(lines.filter((l) => l.indexOf("(…") !== 0));
  S.lines = lines;
  S.text = lines.join("\n");
}

export const wbSummary = {
  tokens: () => (S.text ? tok(wbSummary.context()) : 0),
  context: () => (S.text ? "\n\n[CONVERSATION SUMMARY — earlier messages in this chat, condensed to save room; treat as accurate background]\n" + S.text + "\n[/CONVERSATION SUMMARY]" : ""),
  reset() { S = { lines: [], turns: 0, text: "" }; summaryEvents.emit(); },
  active: () => !!S.text,
  /** Condense older turns in place when the chat passes ~75% of the model context. Returns true if it compacted. */
  compact(hist: { role: string; content: string }[], backend: string, reserve?: number): boolean {
    const limit = limitFor(backend);
    if (!limit || !hist || hist.length < 6) return false;
    const used = hist.reduce((a, h) => a + tok(h.content), 0) + wbSummary.tokens() + (reserve || 0);
    if (used <= limit * 0.75) return false;
    let keep = 4;
    if (hist.slice(-keep).reduce((a, h) => a + tok(h.content), 0) > limit * 0.4) keep = 2;
    let cut = hist.length - keep;
    while (cut < hist.length - 1 && hist[cut]!.role !== "user") cut++;
    if (cut < 2) return false;
    const old = hist.splice(0, cut);
    old.forEach((h) => S.lines.push(h.role === "user" ? "You: " + gist(h.content, 140) : "Assistant: " + gist(h.content, 200)));
    S.turns += old.length;
    fit(limit);
    lsSet(SCOUNT, (lsGet(SCOUNT, 0) || 0) + 1);
    summaryEvents.emit();
    return true;
  },
};
