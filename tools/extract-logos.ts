import { readFileSync, writeFileSync } from "node:fs";
const html = readFileSync("_orig/original.html", "utf8");
for (const [cls, file] of [["logo-rog", "logo-rog"], ["logo-xbox", "logo-xbox"], ["logo-nintendo", "logo-nintendo"]]) {
  const m = html.match(new RegExp('class="arcade-logo ' + cls + '"[^>]*?src="data:image/png;base64,([A-Za-z0-9+/=]+)"'));
  if (!m) { console.log("missing", cls); continue; }
  writeFileSync("src/assets/" + file + ".png", Buffer.from(m[1]!, "base64"));
  console.log(file, m[1]!.length);
}
