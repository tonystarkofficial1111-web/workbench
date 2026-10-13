// Debug hooks for comparing / testing the Block World engine (never part of a release build).
//   serve.ts   injects them into /orig-dbg and /new-dbg
//   build.ts --dbg  injects them into the engine source before it is (optionally) obfuscated, so the production build can be driven too.
// They give a test script access to the engine's private state: grant resources, read placement state, move the clock.
export const MARK = "window.__workbenchVillagers = villagers;";
export const HOOK =
  MARK +
  "window.__dbg={pf:function(){return legacyFactions.find(function(f){return f.isPlayer})},get lp(){return legacyPlayer},get inf(){return wbInf},get mode(){return currentMode},get legacy(){return legacyMode},get day(){return legacyDay},get sim(){return simTime},setSim:function(v){simTime=v},get blds(){return legacyBuildings}};";

// The placement code (ghost preview, defenses) lives in its own closure, so it gets its own hook.
// (a regex, because the --dev bundle re-formats the engine source)
export const MARK2 = /function cancelAll\(\)\s*\{\s*cancelPlace\(\);\s*endDemo\(\);\s*\}/;
export const HOOK2 = (m: string) => m + "window.__dbg2={get ok(){return okSpot},get placing(){return placing},get demo(){return demo},get defs(){return defs}};";

export function hasHooks(text: string) {
  return text.includes(MARK) && MARK2.test(text);
}
export function injectHooks(text: string) {
  return text.replace(MARK, () => HOOK).replace(MARK2, (m) => HOOK2(m));
}
