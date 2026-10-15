import { useEffect, useMemo, useRef, useState } from "react";
import { TAB_BUTTONS, goto, toggleLayout, type TabId } from "../core/nav";
import { Value, useValue } from "../core/store";
import { WB_SOUND } from "../core/sound";
import { CATALOG } from "../arcade/catalog";
import { isLaunchable, launchGame, launchCarHub } from "../arcade/launch";
import { worldUi } from "../tabs/ArcadeTab";
import { liveBg } from "./LiveBackground";

/**
 * Quick search (5.67.0): press Ctrl+K (⌘K on a Mac) or the 🔍 button and type to jump anywhere: the tabs, every section heading on
 * them, the Educational tools, all the arcade games, the car games, the Block World modes and a few settings.
 * The list of sections is read from the page each time it opens, so new sections show up without being listed here.
 */
export const quickSearchOpen = new Value(false);

interface Item { title: string; kind: string; icon: string; words: string; run: () => void }

const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
const clickId = (id: string) => (document.getElementById(id) as HTMLElement | null)?.click();
function flash(el: Element) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("qs-flash"); later(1800, () => el.classList.remove("qs-flash"));
}
function openWorldMode(mode: string) {
  worldUi.modeSelect.set(true); goto("tab-world");
  later(500, () => (document.querySelector(`#mode-select-overlay [data-mode="${mode}"]`) as HTMLElement | null)?.click());
}
function openCar(path: string[]) {
  goto("tab-arcade"); launchCarHub();
  let t = 600; for (const id of path) { later(t, () => clickId(id)); t += 450; }
}

function buildIndex(): Item[] {
  const out: Item[] = [];
  const tabName: Record<string, string> = Object.fromEntries(TAB_BUTTONS.map((t) => [t.id, t.label]));
  // pages
  for (const t of TAB_BUTTONS) out.push({ title: t.label, kind: "Page", icon: "📄", words: t.label, run: () => goto(t.id) });
  // Block World
  out.push({ title: "Block World", kind: "Game", icon: "🧱", words: "block world modes minecraft", run: () => { worldUi.modeSelect.set(true); goto("tab-world"); } });
  out.push({ title: "Block World · Legacy", kind: "Game", icon: "⚔️", words: "legacy kingdoms ai battle castle", run: () => openWorldMode("legacy") });
  out.push({ title: "Block World · Infinite", kind: "Game", icon: "🧟", words: "infinite zombies island waves", run: () => openWorldMode("infinite") });
  out.push({ title: "Block World · Free Style", kind: "Game", icon: "⛺", words: "free style freestyle village tent villagers raid strategy", run: () => openWorldMode("freestyle") });
  // car games
  const cars: Array<[string, string, string[], string]> = [
    ["Drift King", "🛞", ["car-skill-choice", "car-drift-choice"], "drift skyline mustang cars"],
    ["F1 Cockpit", "🏎️", ["car-skill-choice", "car-f1-choice"], "f1 formula racing cockpit cars"],
    ["Rally Race", "🌲", ["car-skill-choice", "car-rally-choice"], "rally offroad gravel cars"],
    ["Take Your Time", "🧠", ["car-thinking-choice"], "take your time garage engine build car thinkers"],
  ];
  for (const [n, i, p, w] of cars) out.push({ title: n, kind: "Car game", icon: i, words: n + " " + w, run: () => openCar(p) });
  out.push({ title: "Car games hub", kind: "Car game", icon: "🚗", words: "cars car guys specially made hub", run: () => { goto("tab-arcade"); launchCarHub(); } });
  // arcade games
  for (const g of CATALOG) {
    if (g.soon || !isLaunchable(g.key)) continue;
    out.push({ title: g.name, kind: "Arcade", icon: "🕹️", words: g.name + " " + g.sub + " " + g.cat, run: () => { goto("tab-arcade"); later(150, () => launchGame(g.key)); } });
  }
  // every section heading on the tabs (read from the page)
  document.querySelectorAll("main section.tab").forEach((sec) => {
    const tab = sec.id as TabId; if (!tabName[tab]) return;
    sec.querySelectorAll("h2, h3").forEach((h) => {
      const text = (h.textContent || "").replace(/\s+/g, " ").trim(); if (!text || text.length > 60) return;
      out.push({ title: text, kind: tabName[tab]!, icon: "§", words: text + " " + tabName[tab], run: () => { goto(tab); later(120, () => flash(h)); } });
    });
  });
  // the Educational work panels (only the open one is in the page)
  document.querySelectorAll("[data-eduw]").forEach((b) => {
    const text = (b.textContent || "").trim(); if (!text) return;
    out.push({ title: text, kind: "Educational", icon: "📚", words: text + " educational study", run: () => { goto("tab-edu"); later(120, () => (b as HTMLElement).click()); } });
  });
  // settings
  out.push({ title: "Switch tab layout (top / side)", kind: "Setting", icon: "📐", words: "layout vertical horizontal sidebar tabs", run: () => toggleLayout() });
  out.push({ title: "Sound on / off", kind: "Setting", icon: "🔊", words: "sound mute audio volume", run: () => WB_SOUND.toggle() });
  out.push({ title: "Live background on / off", kind: "Setting", icon: "✨", words: "live background animated motion graphics", run: () => liveBg.set(!liveBg.get()) });
  return out;
}

function score(it: Item, q: string): number {
  if (!q) return 1;
  const t = it.title.toLowerCase(), w = it.words.toLowerCase(), parts = q.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const p of parts) {
    const i = t.indexOf(p);
    if (i === 0) s += 6; else if (i > 0) s += t[i - 1] === " " ? 4 : 2; else if (w.includes(p)) s += 1; else return 0;
  }
  return s + (it.kind === "Page" ? 0.5 : 0) + (it.kind === "Game" || it.kind === "Car game" ? 0.3 : 0);
}

export function QuickSearch() {
  const open = useValue(quickSearchOpen);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); e.stopPropagation(); quickSearchOpen.set(!quickSearchOpen.get()); }
      else if (e.key === "Escape" && quickSearchOpen.get()) quickSearchOpen.set(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  useEffect(() => {
    if (!open) return;
    setItems(buildIndex()); setQ(""); setSel(0);
    window.setTimeout(() => input.current?.focus(), 20);
  }, [open]);

  const list = useMemo(() => items.map((it) => ({ it, s: score(it, q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 12).map((x) => x.it), [items, q]);
  if (!open) return null;
  const go = (it?: Item) => { if (!it) return; quickSearchOpen.set(false); WB_SOUND.click(); try { it.run(); } catch (e) { console.error(e); } };
  return (
    <div className="qs-back" onMouseDown={(e) => { if (e.target === e.currentTarget) quickSearchOpen.set(false); }}>
      <div className="qs-box" role="dialog" aria-label="Quick search">
        <div className="qs-in">
          <span>🔍</span>
          <input ref={input} value={q} placeholder="Search tabs, tools, games, settings…" onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(list.length - 1, s + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); go(list[sel]); }
            }} />
          <kbd>Esc</kbd>
        </div>
        <div className="qs-list">
          {list.length ? list.map((it, i) => (
            <button key={it.kind + it.title + i} type="button" className={"qs-item" + (i === sel ? " on" : "")} onMouseEnter={() => setSel(i)} onClick={() => go(it)}>
              <span className="qs-ic">{it.icon}</span><span className="qs-t">{it.title}</span><span className="qs-k">{it.kind}</span>
            </button>
          )) : <div className="qs-none">Nothing found for “{q}”</div>}
        </div>
        <div className="qs-foot"><span><kbd>↑</kbd><kbd>↓</kbd> choose</span><span><kbd>Enter</kbd> open</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> anywhere</span></div>
      </div>
    </div>
  );
}

/** the 🔍 button for the top bar */
export function QuickSearchButton() {
  return <button className="icon-btn qs-btn" id="qs-btn" type="button" title="Quick search (Ctrl+K)" aria-label="Quick search" onClick={() => quickSearchOpen.set(true)}>🔍<span className="qs-hint">Ctrl K</span></button>;
}
