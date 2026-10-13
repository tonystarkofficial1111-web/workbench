import { Emitter, lsGet, lsGetRaw, lsSet, lsSetRaw } from "../core/store";
import { getProfile, commitProfile, getCoins } from "../core/profile";

/** Coin shop (original 5.46.0). localStorage 'wb-shop-v1'. */
const SK = "wb-shop-v1";
export const shopEvents = new Emitter();

export interface ShopItem { id: string; kind: "theme" | "accent"; name: string; price: number; val: string }
export const ITEMS: ShopItem[] = [
  { id: "th-noir", kind: "theme", name: "Neon Noir theme", price: 150, val: "noir" },
  { id: "th-crimson", kind: "theme", name: "Crimson Dusk theme", price: 150, val: "crimson" },
  { id: "th-arctic", kind: "theme", name: "Arctic theme", price: 150, val: "arctic" },
  { id: "ac-gold", kind: "accent", name: "Gold accent", price: 80, val: "#ffd34d" },
  { id: "ac-magenta", kind: "accent", name: "Magenta accent", price: 80, val: "#ff4fd8" },
  { id: "ac-lime", kind: "accent", name: "Lime accent", price: 80, val: "#9dff3d" },
];

export interface ShopState { owned: string[]; theme?: string; accent?: string; accentOff?: number }
export const getShop = (): ShopState => lsGet<ShopState>(SK, { owned: [] }) || { owned: [] };
const put = (s: ShopState) => {
  lsSet(SK, s);
  shopEvents.emit();
};

export function applyShop() {
  const s = getShop();
  const r = document.documentElement;
  if (s.theme) r.setAttribute("data-theme", s.theme);
  if (s.accent) r.style.setProperty("--cyan", s.accent);
  else if (s.accentOff) r.style.removeProperty("--cyan");
}
export function equip(it: ShopItem) {
  const q = getShop();
  if (it.kind === "theme") q.theme = it.val;
  else q.accent = it.val;
  put(q);
  applyShop();
}
/** Returns an error message, or '' on success. */
export function buy(it: ShopItem): string {
  if (getCoins() < it.price) return "Not enough coins — you have " + getCoins() + ".";
  const p = getProfile();
  p.coins = getCoins() - it.price;
  commitProfile();
  const q = getShop();
  q.owned.push(it.id);
  put(q);
  return "Bought " + it.name + ".";
}
export function resetShopColors() {
  const q = getShop();
  delete q.theme;
  delete q.accent;
  q.accentOff = 1;
  put(q);
  document.documentElement.setAttribute("data-theme", "default");
  document.documentElement.style.removeProperty("--cyan");
}

/* ------------------------------ full backup ------------------------------ */

const LB = "wb-last-backup";
export const lastBackup = () => +(lsGetRaw(LB) || 0) || 0;
export function backupEverything(appVersion: string) {
  const o: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    o[k] = localStorage.getItem(k);
  }
  const b = new Blob(
    [JSON.stringify({ format: "Stark Workbench Full Backup", version: 1, appVersion, savedAt: new Date().toISOString(), storage: o })],
    { type: "application/json" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = "workbench-full-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  lsSetRaw(LB, String(Date.now()));
  shopEvents.emit();
}
export function restoreBackup(f: File) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(String(r.result));
      if (d.format !== "Stark Workbench Full Backup" || !d.storage) throw 0;
      if (!confirm("Restore " + Object.keys(d.storage).length + " saved items? Matching items on this device will be overwritten.")) return;
      Object.keys(d.storage).forEach((k) => localStorage.setItem(k, d.storage[k]));
      location.reload();
    } catch {
      alert("That is not a Workbench full backup file.");
    }
  };
  r.readAsText(f);
}
