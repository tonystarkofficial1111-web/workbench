// Writes the access-code digest into src/core/gate.ts so the code itself never ships in the bundle.
// Usage: bun run tools/make-gate-hash.ts <code>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const code = process.argv[2];
if (!code) {
  console.error("usage: bun run tools/make-gate-hash.ts <code>");
  process.exit(1);
}
const path = join(import.meta.dir, "../src/core/gate.ts");
const { digest } = await import("../src/core/gate.ts");
const d = digest(code);
let src = readFileSync(path, "utf8");
src = src.replace(/export const ACCESS_DIGEST = "[^"]*";/, `export const ACCESS_DIGEST = "${d}";`);
writeFileSync(path, src);
console.log("ACCESS_DIGEST updated");
