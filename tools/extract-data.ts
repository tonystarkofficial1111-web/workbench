// One-off extraction of large static data blobs from the original app into src/data + src/assets.
// Run: bun run tools/extract-data.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const orig = (f: string) => readFileSync(join(root, "_orig", f), "utf8");
mkdirSync(join(root, "src/data"), { recursive: true });
mkdirSync(join(root, "src/assets"), { recursive: true });

// 1. CHANGELOG array (script 023)
{
  const s = orig("023_script.js");
  const start = s.indexOf("const CHANGELOG = [");
  const end = s.indexOf("\n];", start);
  const arr = new Function("return " + s.slice(start + "const CHANGELOG = ".length, end + 2))();
  writeFileSync(join(root, "src/data/changelog.json"), JSON.stringify(arr));
  console.log("changelog entries:", arr.length);
}

// 2. Arcade cover art + long descriptions (script 037)
{
  const s = orig("037_script.js");
  const grab = (name: string) => {
    const i = s.indexOf("var " + name + "=");
    const lineEnd = s.indexOf("\n", i);
    const lit = s.slice(i + ("var " + name + "=").length, lineEnd).trim().replace(/;$/, "");
    return JSON.parse(lit);
  };
  const covers = grab("WB_COVERS");
  const longDesc = grab("WB_LONG_DESC");
  writeFileSync(join(root, "src/data/covers.json"), JSON.stringify(covers));
  writeFileSync(join(root, "src/data/long-desc.json"), JSON.stringify(longDesc));
  console.log("covers:", Object.keys(covers).length, "long desc:", Object.keys(longDesc).length);
}

// 3. Screensaver videos (script 029)
{
  const s = orig("029_script.js");
  const grab = (name: string) => {
    const i = s.indexOf("var " + name + "='");
    const from = i + ("var " + name + "='").length;
    return s.slice(from, s.indexOf("';", from));
  };
  const gtd = grab("AFK_VIDEO_B64");
  const x = grab("AFK_VIDEO_B64_X");
  writeFileSync(join(root, "src/assets/afk-gtd.b64"), gtd);
  writeFileSync(join(root, "src/assets/afk-x.b64"), x);
  console.log("afk gtd b64:", gtd.length, "x b64:", x.length);
}
