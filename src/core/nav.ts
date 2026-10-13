import { Value, lsGetRaw, lsSetRaw, lsRemove } from "./store";
import { WB_SOUND } from "./sound";
import { getProfile, commitProfile, checkAchievements } from "./profile";

export type TabId = "tab-start" | "tab-edu" | "tab-videos" | "tab-arcade" | "tab-ai" | "tab-data" | "tab-dev" | "tab-world";

export const TAB_BUTTONS: { id: TabId; label: string }[] = [
  { id: "tab-start", label: "Start" },
  { id: "tab-edu", label: "Educational" },
  { id: "tab-videos", label: "Media" },
  { id: "tab-arcade", label: "Arcade" },
  { id: "tab-ai", label: "Assistant" },
  { id: "tab-data", label: "User / Saves" },
  { id: "tab-dev", label: "Developer options" },
];

/** Active top-level tab. Block World (tab-world) has no button; it is entered from the Arcade. */
export const activeTab = new Value<TabId>("tab-start");
/** Arcade sub-tab: games | world | cars */
export const arcadeSub = new Value<"games" | "cars">("games");

export function goto(tab: TabId) {
  const prev = activeTab.get();
  activeTab.set(tab);
  if (tab === "tab-world") {
    window.dispatchEvent(new Event("game:resize"));
    window.dispatchEvent(new Event("world:check-resume"));
  } else if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  if (prev !== tab) setTimeout(updateActiveTabColor, 30);
}

/* ----------------------------- layout ----------------------------- */

export const layoutMode = new Value<"horizontal" | "vertical">(
  lsGetRaw("wb-layout-mode") === "vertical" ? "vertical" : "horizontal",
);
export function toggleLayout() {
  const next = layoutMode.get() === "vertical" ? "horizontal" : "vertical";
  layoutMode.set(next);
  lsSetRaw("wb-layout-mode", next);
}

/* ------------------------ accent + active tab color ------------------------ */

function invert(rgb: string) {
  const m = rgb.match(/\d+/g);
  if (m && m.length >= 3) return `rgb(${255 - parseInt(m[0]!, 10)},${255 - parseInt(m[1]!, 10)},${255 - parseInt(m[2]!, 10)})`;
  return "#ffffff";
}
export function updateActiveTabColor() {
  const bg = getComputedStyle(document.body).backgroundColor;
  document.documentElement.style.setProperty("--wb-active-tab-fg", invert(bg));
}

export function colorToHex(color: string): string {
  color = (color || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
  const m = color.match(/\d+/g);
  if (m && m.length >= 3)
    return "#" + [0, 1, 2].map((i) => Math.max(0, Math.min(255, parseInt(m[i]!, 10))).toString(16).padStart(2, "0")).join("");
  return "#e0a458";
}

const ACCENT_KEY = "wb-accent-color";
export const accentHex = new Value<string>("#e0a458");
export function syncAccentControl(hex?: string) {
  accentHex.set(colorToHex(hex || getComputedStyle(document.documentElement).getPropertyValue("--amber")));
}
export function applyAccent(hex: string | null) {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty("--amber");
    syncAccentControl();
  } else {
    root.style.setProperty("--amber", hex);
    syncAccentControl(hex);
  }
  updateActiveTabColor();
}
export function setAccent(hex: string) {
  applyAccent(hex);
  lsSetRaw(ACCENT_KEY, hex);
}
export function resetAccent() {
  lsRemove(ACCENT_KEY);
  applyAccent(null);
}
export function loadAccent() {
  const saved = lsGetRaw(ACCENT_KEY);
  if (saved && /^#[0-9a-fA-F]{6}$/.test(saved)) applyAccent(saved);
  else {
    syncAccentControl();
    updateActiveTabColor();
  }
}
/** Re-sync after a theme change (the picker follows the theme's own --amber unless a custom accent is saved). */
export function refreshAccentAfterTheme() {
  setTimeout(() => {
    const saved = lsGetRaw(ACCENT_KEY);
    if (saved && /^#[0-9a-fA-F]{6}$/.test(saved)) applyAccent(saved);
    else applyAccent(null);
    updateActiveTabColor();
  }, 60);
}

/* ------------------------------- theme ------------------------------- */

export function applyTheme(theme: string) {
  if (!theme || theme === "default") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}
export function initTheme() {
  const p = getProfile();
  if (p.theme && p.theme !== "default") document.documentElement.setAttribute("data-theme", p.theme);
}
export function chooseTheme(theme: string, requiredTime: number): { ok: boolean; hint?: string } {
  const p = getProfile();
  if (requiredTime > 0 && (p.secondsOnPage || 0) < requiredTime) {
    const mins = Math.ceil((requiredTime - (p.secondsOnPage || 0)) / 60);
    return { ok: false, hint: "Locked — need " + mins + " more minutes in arcade" };
  }
  applyTheme(theme);
  p.theme = theme;
  checkAchievements();
  commitProfile();
  refreshAccentAfterTheme();
  return { ok: true };
}

/** Keyboard: ←/→ moves between top tabs; sounds on tab clicks (original wired both globally). */
export function stepTab(dir: 1 | -1) {
  const ids = TAB_BUTTONS.map((t) => t.id);
  const ci = ids.indexOf(activeTab.get());
  if (ci < 0) return;
  goto(ids[(ci + dir + ids.length) % ids.length]!);
  WB_SOUND.click();
}
