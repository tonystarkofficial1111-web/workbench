// Converts the original Block World module (script 022, three.js) into src/world/engine.ts.
// The simulation/rendering code is kept verbatim; the page glue (imports, profile/assistant/memory access) is adapted.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
let s = readFileSync(join(root, "_orig/022_script.js"), "utf8");
mkdirSync(join(root, "src/world"), { recursive: true });

function rep(from: string | RegExp, to: string, label: string) {
  const before = s;
  s = typeof from === "string" ? s.split(from).join(to) : s.replace(from, to);
  if (before === s) throw new Error("world conversion: pattern not found: " + label);
}

rep(/^\s*import \* as THREE from '[^']+';\s*/m, "", "three import");

// --- complete-save bundle: route profile / assistant / memory through the app's modules ---
rep("if(bundle.arcade && typeof wbProfile!=='undefined'){ wbProfile=bundle.arcade; wbSaveProfile(); }", "if(bundle.arcade){ replaceProfile(bundle.arcade); }", "profile restore");
rep("bundle.arcade=JSON.parse(JSON.stringify(wbProfile));", "bundle.arcade=JSON.parse(JSON.stringify(getProfile()));", "profile export");
rep("bundle.aiMemory=JSON.parse(JSON.stringify(aiMemory));", "bundle.aiMemory=JSON.parse(JSON.stringify(getMemories()));", "memory export");
rep("if(Array.isArray(bundle.aiMemory) && window.wbMemStore){ window.wbMemStore.restore(bundle.aiMemory); }", "if(Array.isArray(bundle.aiMemory)){ restoreMemories(bundle.aiMemory); }", "memory restore");
rep("bundle.aiHistory=JSON.parse(JSON.stringify(history||[]));", "bundle.aiHistory=JSON.parse(JSON.stringify(assistantBridge.getHistory()||[]));", "history export");
rep("if(Array.isArray(bundle.aiHistory) && typeof history!=='undefined'){ history.splice(0,history.length,...bundle.aiHistory); }", "if(Array.isArray(bundle.aiHistory)){ assistantBridge.setHistory(bundle.aiHistory); }", "history restore");
rep("bundle.aiSettings={backend:backend,homeAddress:homeAddress,homeModel:homeModel};", "bundle.aiSettings=assistantBridge.getSettings();", "ai settings");
rep("(typeof APP_VERSION!=='undefined'?APP_VERSION:'unknown')", "APP_VERSION", "app version");

// --- hooks other modules used through window.* ---
rep("window.__wbQuality = {", "quality.hooks = {", "quality hooks");
rep("window.__workbenchDay = legacyDay;", "window.__workbenchDay = legacyDay; worldBridge.day.set(legacyDay);", "day");
rep("window.__workbenchWorld = world;", "window.__workbenchWorld = world; worldBridge.blockCount = function(){ return world.size; }; worldBridge.exportBundle = downloadSave; worldBridge.importData = loadSaveData;", "world export");

// The User / Saves tab ("Export world" / "Import world…") is React and already calls worldBridge.exportBundle / importData.
// The original engine ALSO attached its own listeners to those two elements, which here made every click run twice
// (two downloads, the file imported twice) and wrote its status text into a React-owned node. Drop the engine's copy.
{
  const a = s.indexOf("// Same World save/load, surfaced again in the Update / Export / Import tab");
  const b = s.indexOf("const hint = document.getElementById('game-hint');");
  if (a < 0 || b < a) throw new Error("world conversion: data-tab world save block not found");
  s = s.slice(0, a) + s.slice(b);
}

// --- saving: the Block World file holds the Block World only; the Save button asks Block World or User saves ---
// The Complete Save (world + arcade profile + AI + study) is no longer written. Everything that is not the Block World is a User save now
// (features/saves.ts), and loadSaveData below still reads old Complete Save files, so nothing already saved stops working.
rep(
  "function downloadSave(){",
  `function serializeBlockWorldSave(){
  return { format:'Stark Workbench Block World Save', version:2, appVersion:APP_VERSION, savedAt:new Date().toISOString(), world:serializeWorld(), storage:blockWorldStorage() };
}
function downloadSave(){`,
  "block world save",
);
rep(
  "const blob = new Blob([JSON.stringify(serializeWorkbenchBundle(),null,2)], { type:'application/json' });",
  "const blob = new Blob([JSON.stringify(serializeBlockWorldSave(),null,2)], { type:'application/json' });",
  "download block world only",
);
rep("a.download = 'workbench-save.json';", "a.download = 'workbench-block-world-' + new Date().toISOString().slice(0,10) + '.json';", "download name");
rep(
  "function loadSaveData(data){",
  `function loadSaveData(data){
  if(data && (data.format === 'Stark Workbench User Saves' || data.format === 'Stark Workbench Full Backup')) throw new Error('That is a User saves file, not a Block World save. Restore it from the User / Saves tab.');
  if(data && data.format === 'Stark Workbench Block World Save'){ try{ restoreBlockWorldStorage(data.storage); }catch(e){} data = data.world || {}; }`,
  "load block world save",
);
rep("document.getElementById('save-btn').addEventListener('click', downloadSave);", "document.getElementById('save-btn').addEventListener('click', function(){ openSaveChooser(); });", "save button");

s = s.replace(/\bwbProfile\b/g, "getProfile()");
// Coins from boss kills / dawn bonuses: the original saved through the page's wbSaveProfile(), which is commitProfile() here
// (it also tells the top bar to redraw the coin counter). Without this the call threw inside a try/catch and the coins were never saved.
// The coin counter in the top bar belongs to React, so the engine must not write its text itself: commitProfile() redraws it.
rep(
  "wbSaveProfile(); var c = document.getElementById('coin-count'); if(c) c.textContent = getProfile().coins; }catch(e){} }",
  "commitProfile(); }catch(e){} }",
  "coin save",
);

/* ------------------------------------------------------------------------------------------------------------------
   Infinite-mode extension hooks (src/world/infinite/*).
   The engine above stays the original's logic. Everything new for the Infinite world (jungle island, water, sky, weather, models,
   names and halos...) lives in separate modules that are handed an "env" of engine internals at the very end of initWorld().
   The patches below are the only places the original text is touched for that; each one is a no-op unless the Infinite world runs.
   ------------------------------------------------------------------------------------------------------------------ */

// Camera tilt: the pitch has to be changeable (Z / X in the Infinite world).
rep("const camPitch = THREE.MathUtils.degToRad(58);", "let camPitch = THREE.MathUtils.degToRad(58);", "camPitch");
// A bigger island needs more zoom range.
rep(
  "camDistance = Math.max(10, Math.min(95, camDistance + e.deltaY*0.03));",
  "camDistance = Math.max(10, Math.min(wbInf.on ? 150 : 95, camDistance + e.deltaY*0.03));",
  "zoom range",
);
// The 5.58 effects switch Shaders on by themselves the first time Infinite starts; the extension can veto that (saved Graphics choice).
rep("if(!shadersOn)setShaders(true)}wasInf=on", "if(!shadersOn&&wbGfxAutoShaders())setShaders(true)}wasInf=on", "auto shaders");
// Chopped trees go through one function so the extension can play a falling animation (default: vanish at once, as before).
rep("scene.remove(nearestTree.group);", "wbTreeDown(nearestTree, unit);", "tree down (helpers)");
rep(/scene\.remove\(treeRef\.group\);(\s*trees\.splice\(treeIdx, 1\);)/, "wbTreeDown(treeRef, legacyPlayer);$1", "tree down (king)");
// Click-to-move raycasts the ground blocks; the Infinite island is one merged mesh, so that goes through a hook too.
rep(
  /(\/\/ Move to ground \(only within reachable territories\)\s*var blockList = Array\.from\(world\.values\(\)\);\s*var bHits = )ray\.intersectObjects\(blockList\);/,
  "$1wbGroundHits(ray, blockList);",
  "ground hits",
);
// Defaults for the three hook functions (the extension replaces them while the Infinite world is running).
rep(
  "/* ===== 5.56.0 Infinite: boss nights, defenses with crews, weather and blood moons ===== */\n(function(){",
  `function wbTreeDown(t, by){ scene.remove(t.group); }
function wbGroundHits(ray, list){ return ray.intersectObjects(list); }
function wbGfxAutoShaders(){ return true; }
var __wbIife = {};
/* ===== 5.56.0 Infinite: boss nights, defenses with crews, weather and blood moons ===== */
(function(){`,
  "iife start",
);
{
  // Hand the 5.56 closure's internals (defense meshes, weather state, placement checks) to the extension, right before it closes.
  const end = s.lastIndexOf("\n})();");
  if (end < 0) throw new Error("world conversion: end of the 5.56 closure not found");
  const reg = `
__wbIife.MESH = MESH; __wbIife.wx = wx; __wbIife.defs = defs; __wbIife.boss = boss; __wbIife.pf = pf; __wbIife.say = say;
__wbIife.DEF_R = DEF_R; __wbIife.WL = WL; __wbIife.WT = WT; __wbIife.TR = TR; __wbIife.FPB = FPB; __wbIife.getS = function(){ return S; };
__wbIife.getValid = function(){ return { validDef: validDef, validBuilding: validBuilding }; };
__wbIife.setValid = function(a, b){ if(a) validDef = a; if(b) validBuilding = b; };
__wbIife.getPlacing = function(){ return placing; };
__wbIife.getGhost = function(){ return ghost; };
__wbIife.FLAME_MAT = FLAME_MAT; __wbIife.CORE_MAT = CORE_MAT; __wbIife.GLOW_MAT = GLOW_MAT; __wbIife.HALO_MAT = HALO_MAT; __wbIife.glowGeo = glowGeo;`;
  s = s.slice(0, end) + reg + s.slice(end);
}

// The Infinite day/night banner ("Night (calm) · dawn in 40s" ...) is a fixed overlay on <body>. It was only ever hidden from inside the
// Infinite tick, which stops running when you leave the Block World tab, so the banner stayed painted over every other tab and over the mode
// picker (its z-index 60 sits above the picker's 50). Now one rule decides: Infinite is running, the Block World tab is the open tab, and the
// mode picker is closed. The tick applies it every step and a light watcher applies it while the tick is not running.
rep(
  "function wbInfClearDrips(){",
  `function wbInfHudVisible(){
  var tw = document.getElementById('tab-world'), ov = document.getElementById('mode-select-overlay');
  return !!(wbInf.on && tw && tw.classList.contains('active') && !(ov && ov.classList.contains('show')));
}
function wbInfClearDrips(){`,
  "hud visible rule",
);
rep(
  "document.body.appendChild(h); wbInf.hud = h; return h;",
  "document.body.appendChild(h); wbInf.hud = h; setInterval(function(){ if(h.style.display !== 'none' && !wbInfHudVisible()) h.style.display = 'none'; }, 100); return h;",
  "hud watcher",
);
rep(
  "h.textContent = txt; h.style.display = (tw && tw.classList.contains('active')) ? 'block' : 'none';",
  "h.textContent = txt; h.style.display = wbInfHudVisible() ? 'block' : 'none';",
  "hud tick visibility",
);

// Engine internals the extension may read (ENV_READ), read and re-bind (ENV_BIND), or hold by reference (ENV_CONST).
const ENV_CONST = [
  "scene", "camera", "renderer", "canvas", "world", "trees", "worldFog", "hemi", "sunLight", "sunMesh", "moonMesh", "stars", "camTarget",
  "LEGACY_TERRITORIES", "LEGACY_COSTS", "LEGACY_EQUIP_COSTS", "DAY_LENGTH", "LEGACY_MAP_SIZE", "VILLAGER_NAMES", "TREE_GROW_TIME",
];
const ENV_READ = [
  "shadersOn", "legacyDay", "legacyDayTimer", "legacyMode", "legacyFactions", "legacyPlayer", "legacyBuildings", "legacyOreNodes", "wbInf", "wbFx",
  "followKing", "currentMode", "wbFast", "wbFast10", "navLand", "NAV_N", "legacyAgents", "WB_Z_START",
];
const ENV_BIND = [
  "simTime", "camDistance", "camYaw", "camPitch", "legacyWaterMesh", "WB_ISLAND_R", "WB_GRASS_R",
  "getGroundHeight", "showWorldWarning", "updateHealthBar", "spawnShards", "navDirty", "navEnsure", "landOpen", "seaOpen", "updateLegacyHUD",
  "makeNameTag", "setShaders", "applyShadowFlags", "wbInfSpawn", "makeTree", "makeSoldier", "makeCastle", "createBuilding", "animRig",
  "addArmorVisual", "addShieldVisual", "addSpearVisual", "addCrossbowVisual", "upgradeSwordVisual", "initLegacyMode", "wbInfStop",
  "wbBuildInfiniteTerrain", "updateSky", "killLegacyUnit", "openArmoryMenu", "grantIronUpgrade", "makeSiegeUnit", "updateSoldierMovement",
  "wbTreeDown", "wbGroundHits", "wbGfxAutoShaders", "damageLegacyTarget", "updateLegacy", "selectVillager", "wbInfClearZ",
];
const envCode = `
function __wbBuildEnv(){
  var env = { THREE: THREE, iife: __wbIife };
${ENV_CONST.map((n) => `  env.${n} = ${n};`).join("\n")}
${ENV_READ.map((n) => `  Object.defineProperty(env, ${JSON.stringify(n)}, { get: function(){ return ${n}; }, enumerable: true });`).join("\n")}
${ENV_BIND.map((n) => `  Object.defineProperty(env, ${JSON.stringify(n)}, { get: function(){ return ${n}; }, set: function(v){ ${n} = v; }, enumerable: true });`).join("\n")}
  return env;
}
try{ installInfinite(__wbBuildEnv()); }catch(e){ console.error('Infinite extension failed to start', e); }
`;

const header = `// @ts-nocheck
// Block World engine (three.js). Generated by tools/convert-world.ts from the original app's world module; logic verbatim.
import * as THREE from "three";
import { getProfile, replaceProfile, commitProfile } from "../core/profile";
import { quality } from "../core/perf";
import { worldBridge, assistantBridge } from "../core/bridge";
import { getMemories, restoreMemories } from "../features/memory";
import { APP_VERSION } from "../version";
import { openSaveChooser, blockWorldStorage, restoreBlockWorldStorage } from "../features/saves";
import { installInfinite } from "./infinite";

let started = false;
/** Boots the world. Call once, after the Block World markup (canvas, HUD, hotbar...) is in the document. */
export function initWorld() {
  if (started) return;
  started = true;
`;
writeFileSync(join(root, "src/world/engine.ts"), header + s + envCode + "\n}\n");
console.log("world engine written", s.length);
