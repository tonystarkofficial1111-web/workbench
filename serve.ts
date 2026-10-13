// Dev-only static server: /orig -> _orig/original.html, /new -> dist/Workbench.html
// POST /save?name=foo  -> writes body to _orig/data/foo (used to dump runtime data from the original app)
import { mkdirSync } from "node:fs";
const root = import.meta.dir;
mkdirSync(root + "/_orig/data", { recursive: true });
Bun.serve({
  port: 5173,
  maxRequestBodySize: 1 << 28,
  async fetch(req) {
    const u = new URL(req.url);
    const p = u.pathname;
    if (req.method === "POST" && p === "/save") {
      const name = (u.searchParams.get("name") || "x.json").replace(/[^a-zA-Z0-9._-]/g, "_");
      await Bun.write(root + "/_orig/data/" + name, await req.arrayBuffer());
      return new Response("ok");
    }
    const file = p.startsWith("/orig") ? "_orig/original.html" : "dist/Workbench.html";
    return new Response(Bun.file(root + "/" + file), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  },
});
console.log("serving on 5173");
