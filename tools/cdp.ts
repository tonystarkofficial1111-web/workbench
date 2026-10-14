// Tiny Chrome DevTools Protocol driver for visual checks of the built app, independent of any browser pane.
//   const c = await launchChrome({ width: 1280, height: 720 });
//   const p = await c.page("http://localhost:5173/new-dbg");
//   await p.eval("document.title"); await p.shot("out.png"); await c.close();
// Uses the installed Chrome in headless mode; WebGL runs on the GPU if there is one, else on the software renderer.
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  (process.env.LOCALAPPDATA || "") + "\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

class Conn {
  ws!: WebSocket;
  id = 0;
  pending = new Map<number, { res: (v: any) => void; rej: (e: any) => void }>();
  listeners: Array<(m: any) => void> = [];
  static async open(url: string) {
    const c = new Conn();
    c.ws = new WebSocket(url);
    await new Promise<void>((res, rej) => { c.ws.onopen = () => res(); c.ws.onerror = (e) => rej(e); });
    c.ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && c.pending.has(m.id)) {
        const p = c.pending.get(m.id)!; c.pending.delete(m.id);
        if (m.error) p.rej(new Error(m.error.message + " " + JSON.stringify(m.error.data || ""))); else p.res(m.result);
      } else c.listeners.forEach((l) => l(m));
    };
    return c;
  }
  send(method: string, params: any = {}): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
}

export class Page {
  errors: string[] = [];
  logs: string[] = [];
  constructor(public conn: Conn, public w: number, public h: number) {
    conn.listeners.push((m) => {
      if (m.method === "Runtime.exceptionThrown") this.errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "exception");
      if (m.method === "Runtime.consoleAPICalled") {
        const t = m.params.type, txt = (m.params.args || []).map((a: any) => a.value ?? a.description ?? "").join(" ");
        if (t === "error") this.errors.push("console.error: " + txt); else this.logs.push(t + ": " + txt);
      }
    });
  }
  async goto(url: string) { await this.conn.send("Page.navigate", { url }); await this.sleep(800); await this.waitLoad(); }
  async waitLoad() {
    for (let i = 0; i < 80; i++) { const r = await this.eval("document.readyState"); if (r === "complete") return; await this.sleep(150); }
  }
  async eval(expr: string, timeout = 120000): Promise<any> {
    const r = await Promise.race([
      this.conn.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("eval timeout: " + expr.slice(0, 80))), timeout)),
    ]);
    if (r.exceptionDetails) throw new Error("page error: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
  async shot(path: string, clip?: { x: number; y: number; width: number; height: number }) {
    const r = await this.conn.send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
    writeFileSync(path, Buffer.from(r.data, "base64"));
  }
  async click(x: number, y: number) {
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
      await this.conn.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
  }
  async key(key: string, code = key, down = true, up = true) {
    if (down) await this.conn.send("Input.dispatchKeyEvent", { type: "keyDown", key, code });
    if (up) await this.conn.send("Input.dispatchKeyEvent", { type: "keyUp", key, code });
  }
}

export async function launchChrome(opts: { width?: number; height?: number; port?: number; args?: string[]; dpr?: number } = {}) {
  if (!CHROME) throw new Error("Chrome not found");
  const port = opts.port || 9333, w = opts.width || 1280, h = opts.height || 720;
  const dir = join(tmpdir(), "wb-cdp-" + Date.now());
  mkdirSync(dir, { recursive: true });
  const proc = Bun.spawn([CHROME, "--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + dir, `--window-size=${w},${h}`,
    "--no-first-run", "--no-default-browser-check", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", ...(opts.args || []), "about:blank"], { stdout: "ignore", stderr: "ignore" });
  let wsUrl = "";
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const pg = list.find((t: any) => t.type === "page");
      if (pg) wsUrl = pg.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    if (!wsUrl) await new Promise((r) => setTimeout(r, 250));
  }
  if (!wsUrl) { proc.kill(); throw new Error("Chrome did not start"); }
  const conn = await Conn.open(wsUrl);
  await conn.send("Page.enable"); await conn.send("Runtime.enable");
  await conn.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: opts.dpr || 1, mobile: false });
  const page = new Page(conn, w, h);
  return {
    page,
    close: async () => { try { conn.ws.close(); } catch { /* ignore */ } proc.kill(); },
  };
}
