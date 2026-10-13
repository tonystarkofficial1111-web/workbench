// Splits a single-file Workbench release into its <style>/<script> blocks (document order) so versions can be diffed.
//   bun run tools/split-html.ts "<path to Workbench_x_y_z.html>" _orig594
// Writes NNN_script.js / NNN_style.css, _index.txt (line, length, attributes) and page.html (markup with blocks replaced by __BLOCK__).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [src, outDir] = process.argv.slice(2);
if (!src || !outDir) throw new Error("usage: split-html.ts <html> <outDir>");
const html = readFileSync(src, "utf8");
mkdirSync(outDir, { recursive: true });

const re = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
let n = 0;
let last = 0;
let page = "";
const index: string[] = [];
for (const m of html.matchAll(re)) {
  n++;
  const kind = m[1]!.toLowerCase();
  const attrs = (m[2] ?? "").trim();
  const body = m[3]!;
  const line = html.slice(0, m.index).split("\n").length;
  const name = `${String(n).padStart(3, "0")}_${kind}.${kind === "script" ? "js" : "css"}`;
  writeFileSync(join(outDir, name), body);
  index.push(`${name}  line=${line}  len=${body.length}  attrs=[${attrs}]`);
  page += html.slice(last, m.index) + `<${kind}${attrs ? " " + attrs : ""}>__BLOCK__</${kind}>`;
  last = m.index! + m[0].length;
}
page += html.slice(last);
writeFileSync(join(outDir, "_index.txt"), index.join("\n") + "\n");
writeFileSync(join(outDir, "page.html"), page.replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{200,}/gi, "data:BASE64"));
console.log("blocks", n);
