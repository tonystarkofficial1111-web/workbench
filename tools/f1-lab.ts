// A small test bench for the F1 Cockpit: builds the dev build, serves it, drives the game in headless Chrome and takes pictures into ./_f1lab/.
//   bun run tools/f1-lab.ts lap   <circle|technical|complex|curvy> [level 0-2]        autopilot for one lap: lap time, suspension peaks, picture
//   bun run tools/f1-lab.ts race  <map>                                               five laps with a pit stop up to the chequered flag
//   bun run tools/f1-lab.ts crash <map> <scene 0-19> [mph]                            drive into the left barrier, pictures of the crash scene and the report
//   bun run tools/f1-lab.ts top   <map> [level]                                       top-down picture of the whole circuit and its scenery
// The dev build exposes window.__f1View (see README, "F1 Cockpit"). The autopilot holds a target speed, slows for the bends ahead, shifts with Y / U and steers back to the middle.
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { launchChrome } from "./cdp";

const root = join(import.meta.dir, "..");
const out = join(root, "_f1lab");
mkdirSync(out, { recursive: true });
const [cmd = "lap", map = "circle", a3, a4] = process.argv.slice(2);

const build = Bun.spawnSync(["bun", "run", "build.ts", "--dev"], { cwd: root, env: { ...process.env, WB_OUT: join(out, "dev.html") }, stdout: "ignore", stderr: "inherit" });
if (build.exitCode !== 0 || !existsSync(join(out, "dev.html"))) { console.error("dev build failed"); process.exit(1); }
const server = Bun.serve({ port: 0, fetch: () => new Response(Bun.file(join(out, "dev.html")), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }) });
const url = `http://localhost:${server.port}/`;

const chrome = await launchChrome({ width: 1600, height: 1100, port: 9340, dpr: 1 });
const p = chrome.page;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shotFeed = async (name: string) => {
  const r = await p.eval(`(()=>{ const r=document.getElementById('f1-canvas').getBoundingClientRect(); return {x:r.left,y:r.top,width:r.width,height:r.height}; })()`);
  await p.shot(join(out, name), { x: Math.max(0, r.x - 4), y: Math.max(0, r.y - 4), width: r.width + 8, height: r.height + 8 });
};

async function start(level?: number) {
  await p.goto(url); await sleep(900);
  if (level !== undefined) { await p.eval(`localStorage.setItem('wb-f1-gfx','${level}')`); await p.goto(url); await sleep(900); }
  await p.eval(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms));
    const skip=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/^Skip$/.test(b.textContent.trim())); if(skip){ skip.click(); await s(400); }
    [...document.querySelectorAll('.tabbtn')].find(b=>b.getAttribute('data-target')==='tab-arcade').click(); await s(700);
    document.getElementById('cars-subtab').click(); await s(900);
    document.getElementById('car-hub-open').click(); await s(900);
    document.getElementById('car-f1-choice').click(); await s(900);
    document.querySelector('[data-f1map="${map}"]').click(); await s(1500); })()`);
}
const driver = (body: string) => p.eval(`(()=>{ if(window.__auto) clearInterval(window.__auto.t); const held={};
  const set=(c,on)=>{ if(!!held[c]===on) return; held[c]=on; window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code:c,key:c,bubbles:true})); };
  const tap=(c)=>{ window.dispatchEvent(new KeyboardEvent('keydown',{code:c,key:c,bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{code:c,key:c,bubbles:true})); };
  const a={last:0}; a.t=setInterval(()=>{ const v=window.__f1View; if(!v||!v.last) return; const pl=v.last.player, P=v.dbg().path; ${body} },16); window.__auto=a; })()`);
const autopilot = (max = 80, margin = 0.55) => driver(`
  let k=0; for(let i=0;i<=8;i++){ k=Math.max(k,Math.abs(P.at(pl.lapDist+0.004*i).kap)); }
  const target=Math.min(${max}, Math.sqrt(${margin}*108/Math.max(k,1e-4))/(0.0015*P.total));
  set('KeyW',pl.speed<target-1); set('KeyS',pl.speed>target+6);
  const now=performance.now(); if(now-a.last>260){ if(pl.rpm>=0.9&&pl.gear<10){ tap('KeyY'); a.last=now; } else if(pl.rpm<0.42&&pl.gear>1){ tap('KeyU'); a.last=now; } }
  const s=-(pl.lat||0)*0.7-(pl.vy||0)*0.5; set('KeyA',s<-0.25); set('KeyD',s>0.25);`);
const intoTheBarrier = (mph: number) => driver(`
  set('KeyW',true); set('KeyA',pl.speed>=${mph}||Math.abs(pl.lat||0)>0.3);
  const now=performance.now(); if(now-a.last>260&&pl.rpm>=0.9&&pl.gear<10){ tap('KeyY'); a.last=now; }`);
const read = (js: string) => p.eval(js);

try {
  if (cmd === "lap") {
    await start(a3 !== undefined ? Number(a3) : undefined); await autopilot();
    const mx = { roll: 0, pitch: 0, wmin: 0, wmax: 0, gl: 0, gb: 0 }; let lap = "", t = "";
    for (let i = 0; i < 400; i++) {
      await sleep(100);
      const s = await read(`(()=>{ const pl=window.__f1View.last.player; return {r:pl.roll,pt:pl.pitch,w:pl.wheel,gl:pl.gLat,gb:pl.gLong,lap:document.getElementById('f1-lap').textContent,t:document.getElementById('f1-time-display').textContent,st:document.getElementById('f1-status-label').textContent}; })()`);
      mx.roll = Math.max(mx.roll, Math.abs(s.r)); mx.pitch = Math.max(mx.pitch, Math.abs(s.pt)); mx.gl = Math.max(mx.gl, Math.abs(s.gl)); mx.gb = Math.max(mx.gb, Math.abs(s.gb));
      for (const w of s.w) { mx.wmin = Math.min(mx.wmin, w); mx.wmax = Math.max(mx.wmax, w); }
      lap = s.lap; t = s.t; if (i === 40) await shotFeed(`lap-${map}.png`);
      if (lap.startsWith("2") || /DISQ/.test(s.st)) break;
    }
    console.log(`lap ${lap} after ${t} | roll ${mx.roll.toFixed(3)} rad, pitch ${mx.pitch.toFixed(3)}, wheel travel ${mx.wmin.toFixed(3)}..${mx.wmax.toFixed(3)} m, ${mx.gl.toFixed(1)} g sideways, ${mx.gb.toFixed(1)} g braking`);
  } else if (cmd === "race") {
    await start(); await autopilot(85); let pit = false, last = "";
    for (let i = 0; i < 300; i++) {
      await sleep(500); last = await read(`document.getElementById('f1-lap').textContent+'|'+document.getElementById('f1-status-label').textContent`);
      if (!pit && last.startsWith("2")) { pit = true; await p.key("p", "KeyP"); }
      if (/CHEQUERED|DISQ/.test(last)) break;
    }
    console.log("race:", last, "|", await read(`document.getElementById('f1-msg').textContent`));
  } else if (cmd === "crash") {
    await start(); await read(`window.__f1Scene=${Number(a3 ?? 0)}`); await intoTheBarrier(Number(a4 ?? 85));
    let t0 = 0; for (let i = 0; i < 400 && !t0; i++) { await sleep(50); if (await read(`!!(window.__f1View&&window.__f1View.crashing)`)) t0 = Date.now(); }
    if (!t0) throw new Error("the car never touched the barrier");
    console.log("scene:", await read(`window.__f1View.dbg().crash.scene.title`), "|", await read(`document.getElementById('f1-msg').textContent`));
    let n = 0; for (const s of [0.3, 1, 2, 3.5, 5, 6.6]) { while (Date.now() - t0 < s * 1000) await sleep(40); await shotFeed(`crash-${map}-${a3 ?? 0}-${n++}.png`); }
    await sleep(900); await p.shot(join(out, `crash-${map}-${a3 ?? 0}-report.png`));
    console.log("report in the page:", await read(`!!document.getElementById('f1-report')`));
  } else if (cmd === "top") {
    await start(a3 !== undefined ? Number(a3) : 2);
    await read(`(()=>{ const v=window.__f1View, d=v.dbg(), T=d.THREE, P=d.path; const w=(P.maxX-P.minX)+200, h=(P.maxZ-P.minZ)+200, cx=(P.minX+P.maxX)/2, cz=(P.minZ+P.maxZ)/2;
      const cam=new T.OrthographicCamera(-w/2,w/2,h/2,-h/2,1,2000); cam.position.set(cx,900,cz); cam.up.set(0,0,-1); cam.lookAt(cx,0,cz); cam.updateProjectionMatrix(); d.scene.fog=null;
      v.render=function(){ const r=d.renderer; r.setRenderTarget(null); r.clear(); r.render(d.scene,cam); return null; }; })()`);
    await sleep(800); await shotFeed(`top-${map}.png`);
  } else console.log("commands: lap | race | crash | top");
  console.log("page errors:", JSON.stringify(p.errors.slice(0, 5)), "| pictures in", out);
} finally { await chrome.close(); server.stop(); }
process.exit(0);
