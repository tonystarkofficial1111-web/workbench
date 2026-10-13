import { readFileSync, writeFileSync } from "node:fs";
const slots = JSON.parse(readFileSync("_orig/data/slots.json", "utf8"));
const covers = JSON.parse(readFileSync("src/data/covers.json", "utf8"));
const long = JSON.parse(readFileSync("src/data/long-desc.json", "utf8"));
const MERGED = new Set(["neonBreaker","starfallDefender","meteorCommand","memoryMatch","patternMemory","towerBuilder","bubbleSort"]);
const CATS = new Set(["patience","fast","skill"]);
const items = [];
for (const s of slots) {
  if (!s.name || !s.cat || !s.hasBubble || !CATS.has(s.cat)) continue;
  if (MERGED.has(s.key)) continue;
  const lk = s.name.toLowerCase();
  items.push({ id: s.id, key: s.key, name: s.name, cat: s.cat, sub: s.sub, soon: /coming soon/i.test(s.label || ""), desc: long[lk] || s.desc, hasCover: !!covers[lk] });
}
console.log(items.length, "items; without cover:", items.filter(i => !i.hasCover).map(i => i.name).join(", "));
writeFileSync("src/data/catalog.json", JSON.stringify(items.map(({hasCover, ...r}) => r)));
// every game (incl. merged) for the registry used by Daily challenge
