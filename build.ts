// Builds src/main.tsx into ONE self-contained HTML file (dist/Workbench.html)
// that runs from a file:// URL in Chrome: all JS, CSS, fonts and media are inlined.
//
//   bun run build.ts            production build: minified + obfuscated app code
//   bun run build.ts --dev      readable build (no minify, no obfuscation) for debugging
//   bun run build.ts --no-obf   minified but not obfuscated
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { BunPlugin } from "bun";

const root = import.meta.dir;
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version: string = pkg.workbenchVersion ?? "5.59.0";
const watchMode = process.argv.includes("--dev");
const obfuscate = !watchMode && !process.argv.includes("--no-obf");

// Cascade order matters: every stylesheet in src/styles is imported in filename order (see PORTING_NOTES.md).
writeFileSync(
  join(root, "src/styles.ts"),
  readdirSync(join(root, "src/styles")).filter((f) => f.endsWith(".css")).sort().map((f) => `import "./styles/${f}";`).join("\n") + "\n",
);

/* ------------------------------ obfuscation ------------------------------ */
// Only OUR source is obfuscated (never react / three.js, never the big media + data blobs).
// Three tiers: sensitive files get control-flow flattening + dead code; game/world engines get light, speed-safe
// protection; everything else gets identifier mangling + encoded string table.
const SENSITIVE = [/src[\\/]core[\\/]gate\./, /src[\\/]features[\\/]memory\./, /src[\\/]tabs[\\/]DevTab\./, /src[\\/]components[\\/]MemLock\./, /src[\\/]tabs[\\/]AssistantTab\./];
const ENGINE = [/src[\\/]world[\\/]/, /src[\\/]arcade[\\/](games|legacy029|protos|pixelDuel)/];

function obfuscatorOptions(path: string) {
  const base = {
    compact: true,
    sourceType: "module" as const,
    target: "browser" as const,
    identifierNamesGenerator: "hexadecimal" as const,
    renameGlobals: false,
    renameProperties: false,
    stringArray: true,
    stringArrayEncoding: ["base64" as const],
    stringArrayThreshold: 0.75,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 1,
    stringArrayWrappersType: "variable" as const,
    splitStrings: false,
    unicodeEscapeSequence: false,
    numbersToExpressions: false,
    simplify: true,
    transformObjectKeys: false,
    selfDefending: false,
    debugProtection: false,
    disableConsoleOutput: false,
  };
  if (SENSITIVE.some((r) => r.test(path))) {
    return { ...base, controlFlowFlattening: true, controlFlowFlatteningThreshold: 0.75, deadCodeInjection: true, deadCodeInjectionThreshold: 0.35, numbersToExpressions: true, stringArrayThreshold: 1 };
  }
  if (ENGINE.some((r) => r.test(path))) {
    return { ...base, stringArrayThreshold: 0.5, stringArrayEncoding: [] as never[] };
  }
  return { ...base, stringArrayThreshold: 0.8 };
}

const obfPlugin: BunPlugin = {
  name: "workbench-obfuscate",
  setup(build) {
    const JavaScriptObfuscator = require("javascript-obfuscator");
    const transpilers = {
      ts: new Bun.Transpiler({ loader: "ts", target: "browser" }),
      tsx: new Bun.Transpiler({ loader: "tsx", target: "browser", tsconfig: { compilerOptions: { jsx: "react-jsx" } } as any }),
    };
    build.onLoad({ filter: /[\\/]src[\\/].*\.(ts|tsx)$/ }, (args) => {
      if (args.path.endsWith(".d.ts") || /src[\\/]styles\.ts$/.test(args.path)) return undefined;
      const code = readFileSync(args.path, "utf8");
      let js = (args.path.endsWith(".tsx") ? transpilers.tsx : transpilers.ts).transformSync(code);
      // Bun's standalone transpiler leaves the automatic-JSX helper names (jsx_xxx / jsxs_xxx / Fragment_xxx) unimported.
      const jsxRefs = new Map<string, string>();
      for (const m of js.matchAll(/\b(jsxs|jsx|Fragment)_([a-z0-9]{6,})\b/g)) jsxRefs.set(m[0], m[1]!);
      if (jsxRefs.size) {
        js = `import { ${[...jsxRefs].map(([alias, base]) => `${base} as ${alias}`).join(", ")} } from "react/jsx-runtime";\n` + js;
      }
      const out = JavaScriptObfuscator.obfuscate(js, obfuscatorOptions(args.path)).getObfuscatedCode();
      return { contents: out, loader: "js" };
    });
  },
};

const t0 = Date.now();
const result = await Bun.build({
  entrypoints: [join(root, "src/main.tsx")],
  target: "browser",
  format: "iife",
  minify: !watchMode,
  sourcemap: "none",
  plugins: obfuscate ? [obfPlugin] : [],
  define: {
    "process.env.NODE_ENV": JSON.stringify(watchMode ? "development" : "production"),
    __WB_VERSION__: JSON.stringify(version),
  },
  loader: ({
    ".woff2": "dataurl",
    ".png": "dataurl",
    ".svg": "text",
    ".b64": "text",
    ".txt": "text",
  }) as any,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

let js = "";
let css = "";
for (const out of result.outputs) {
  const text = await out.text();
  if (out.path.endsWith(".js")) js += text;
  else if (out.path.endsWith(".css")) css += text;
}

// Inline-script safety: a literal "</script" or "<!--" inside the JS would end the tag early.
const safeJs = js.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
const safeCss = css.replace(/<\/(style)/gi, "<\\/$1");

const template = readFileSync(join(root, "src/index.html"), "utf8");
const html = template
  .replace("<!--WB_CSS-->", () => `<style>${safeCss}</style>`)
  .replace("<!--WB_JS-->", () => `<script>${safeJs}</script>`);

mkdirSync(join(root, "dist"), { recursive: true });
const outFile = join(root, "dist", "Workbench.html");
writeFileSync(outFile, html);
console.log(
  `Built ${relative(root, outFile)}  ${(html.length / 1048576).toFixed(2)} MB  (js ${(js.length / 1024).toFixed(0)} KB, css ${(css.length / 1024).toFixed(0)} KB)  ${obfuscate ? "obfuscated" : watchMode ? "dev" : "minified"}  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
);
