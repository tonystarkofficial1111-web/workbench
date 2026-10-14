// Dev-only static server: /orig -> _orig/original.html, /new -> dist/Workbench.html
// /orig-dbg and /new-dbg serve the same pages with debug hooks (window.__dbg, window.__dbg2) injected into the Block World engine so
// resources can be granted and internal state read while comparing the original against the port (see tools/dev-hooks.ts).
// Build the port with --dev for /new-dbg. /harness.js serves the browser-side test helpers (tools/dev-harness.js).
// POST /save?name=foo  -> writes body to _orig/data/foo (used to dump runtime data from the original app)
import { mkdirSync } from "node:fs";
import { hasHooks, injectHooks } from "./tools/dev-hooks";

const root = import.meta.dir;
mkdirSync(root + "/_orig/data", { recursive: true });

const PORT = Number(process.env.PORT) || 5173;
Bun.serve({
  port: PORT,
  maxRequestBodySize: 1 << 28,
  async fetch(req) {
    const u = new URL(req.url);
    const p = u.pathname;
    if (req.method === "POST" && p === "/save") {
      const name = (u.searchParams.get("name") || "x.json").replace(/[^a-zA-Z0-9._-]/g, "_");
      await Bun.write(root + "/_orig/data/" + name, await req.arrayBuffer());
      return new Response("ok");
    }
    if (p === "/harness.js") return new Response(Bun.file(root + "/tools/dev-harness.js"), { headers: { "content-type": "text/javascript", "cache-control": "no-store" } });
    const file = p.startsWith("/orig") ? "_orig/original.html" : "dist/Workbench.html";
    const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };
    if (p.endsWith("-dbg")) {
      const text = await Bun.file(root + "/" + file).text();
      if (!hasHooks(text)) return new Response("debug markers not found (build the port with --dev)", { status: 500 });
      return new Response(injectHooks(text), { headers });
    }
    return new Response(Bun.file(root + "/" + file), { headers });
  },
});
console.log("serving on " + PORT);
