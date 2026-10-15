// @ts-nocheck
import { buildCatapult, buildBallista, boltParts, animXbow } from "./models";
import { applyTier } from "../infinite/mb";

/**
 * Siege engines for every mode of the Block World engine (Legacy and Infinite; Free Style uses the same models in src/world/freestyle).
 * - The Workshop's crossbow is now a GIANT CROSSBOW: a wheeled siege engine a little bigger than the catapult that fires huge bolts
 *   through enemy troops (up to three in a line). AI kingdoms build them too.
 * - Catapults are rebuilt in detail and now aim at troops (and zombies in Infinite) as well as castles: they pick whatever their boulder
 *   would hurt most, so a tight group of soldiers is a better target than a far wall.
 * The engine's own catapult code is replaced through the env bindings (makeSiegeUnit, updateSiegeUnits, boulderImpact, openWorkshopMenu).
 */
export const GIANT_CROSSBOW_COST = 14;   // iron (the catapult costs 15)
const BOLT_DMG = 34, BOLT_SPEED = 30, BOLT_G = 4, RELOAD = 2.8;

export function installSiege(ctx: any, env: any) {
  const T = env.THREE;
  const hyp = (a: any, b: any) => Math.hypot(a.x - b.x, a.z - b.z);
  const track = (owner: any, tiers: any[][]) => { const h = { userData: { tiers, owner } }; ctx.tiered.push(h); applyTier(h, ctx.gfx.f.tier); };

  // ------------------------------------------------------------------------------------------------ models on every new siege unit
  let nextKind: string | null = null;
  const origMake = env.makeSiegeUnit;
  env.makeSiegeUnit = function (x: number, z: number, color: number, faction: any) {
    const s = origMake(x, z, color, faction);
    try { dress(s, nextKind || (faction && !faction.isPlayer && Math.random() < 0.4 ? "ballista" : "catapult"), color); }
    catch (e) { console.error("siege model", e); }
    return s;
  };
  function dress(s: any, kind: string, color: number) {
    const g = s.group;
    g.children.slice().forEach((c: any) => {
      if (c === s.hbSprite) return;
      g.remove(c);
      c.traverse((n: any) => { if (n.geometry) n.geometry.dispose(); if (n.material && n.material.dispose) n.material.dispose(); });
    });
    s.kind = kind;
    const r: any = kind === "ballista" ? buildBallista(ctx, color) : buildCatapult(ctx, color);
    g.add(r.root);
    s.rig = r; s.wheels = r.wheels;
    if (kind === "ballista") {
      s.name = "Giant Crossbow"; s.pivot = null; s.bucket = null; s.load = 0.6; s.fire = 0;
      s.health = s.maxHealth = 75; s.attackRange = 15; s.attackPower = 6; s.speed = 0.75 + Math.random() * 0.2;
    } else {
      s.name = "Catapult"; s.pivot = r.pivot; s.bucket = r.bucket; s.thr = 0; s.pend = null;
      s.attackRange = 14;
    }
    r.pick.forEach((m: any) => { m.userData.owner = s; m.userData.isSiege = true; });
    s.pickables = r.pick;
    if (s.hbSprite) s.hbSprite.position.y = kind === "ballista" ? 2.4 : 2.3;
    track(g, r.tiers);
    try { env.updateSiegeHealthBar(s); } catch { /* ignore */ }
  }

  // ------------------------------------------------------------------------------------------------ who is an enemy
  function foesOf(f: any) {
    const out: any[] = [];
    (env.legacyFactions || []).forEach((o: any) => {
      if (o === f || o.defeated) return;
      o.units.forEach((u: any) => { if (u.alive && !u.boat) out.push(u); });
      o.siegeUnits.forEach((u: any) => { if (u.alive && !u.boat) out.push(u); });
    });
    const inf = env.wbInf;
    if (inf && inf.on && f && f.isPlayer) inf.z.forEach((z: any) => { if (z.alive) out.push(z); });
    return out;
  }
  function nearestCastle(f: any, s: any) {
    let c: any = null, cd = 1e9;
    (env.legacyFactions || []).forEach((o: any) => { if (o === f || o.defeated || !o.castle || !o.castle.alive) return; const d = hyp(o.castle, s); if (d < cd) { cd = d; c = o.castle; } });
    return { c, cd };
  }
  /** walk towards a spot at `k` of the range from an enemy castle (or straight to it once a road has been found) */
  function advance(s: any, c: any, cd: number, k: number) {
    const ex = s.x - c.x, ez = s.z - c.z, ed = Math.hypot(ex, ez) || 1, rg = s.attackRange;
    if (s.route && s.route.done && cd > rg) { s.tx = c.x; s.tz = c.z; } else { s.tx = c.x + ex / ed * rg * k; s.tz = c.z + ez / ed * rg * k; }
  }

  // ------------------------------------------------------------------------------------------------ catapult: troops, zombies or castles
  function catapultTick(s: any, f: any, foes: any[], dt: number) {
    if (s.attackCooldown > 0) s.attackCooldown -= dt;
    const rg = s.attackRange;
    const { c, cd } = nearestCastle(f, s);
    let best: any = null, bs = 0;
    if (c && cd <= rg) { best = c; bs = 2.6; }
    for (const u of foes) {
      const d = hyp(u, s); if (d < 3.5 || d > rg) continue;
      let n = 1; for (const v of foes) if (v !== u && Math.abs(v.x - u.x) < 2.4 && Math.abs(v.z - u.z) < 2.4) n++;
      const sc = n + (d < 7 ? 1 : 0) + (u.isSiege ? 0.5 : 0);   // a crowd, someone close, or an enemy engine
      if (sc > bs) { bs = sc; best = u; }
    }
    if (s.boat) best = null;
    if (best) {
      s.tx = s.x; s.tz = s.z;
      const da = env.turnTo(s, Math.atan2(best.x - s.x, best.z - s.z), dt, 2.2);
      if (da < 0.15 && s.attackCooldown <= 0 && !(s.thr > 0)) { s.attackCooldown = 4.2; s.thr = 0.3; s.pend = best; }
    } else if (c) advance(s, c, cd, 0.8);
    env.updateSoldierMovement(s, dt);
    animCatapult(s, dt);
  }
  function animCatapult(s: any, dt: number) {
    if (!s.pivot) return;
    let th: number;
    if (s.thr > 0) {
      s.thr -= dt; th = -1.2 + 2.1 * (1 - Math.max(0, s.thr) / 0.3);
      if (s.pend && s.thr <= 0.1) { try { env.launchBoulder(s, s.pend); } catch (e) { console.error(e); } s.pend = null; }
    } else th = 0.9 - 2.1 * Math.min(1, Math.max(0, 1 - s.attackCooldown / 4));
    s.pivot.rotation.x = th;
    const r = s.rig;
    if (r) {
      r.ammo.visible = s.pend ? true : s.thr > 0 ? false : s.attackCooldown < 1.4;
      if (!(s.thr > 0) && s.attackCooldown > 0.3) r.winch.rotation.x -= dt * 3.2;   // the crew winds the arm back down
    }
  }

  // ------------------------------------------------------------------------------------------------ giant crossbow: troops first
  function ballistaTick(s: any, f: any, foes: any[], dt: number) {
    const rg = s.attackRange;
    let best: any = null, bd = 1e9;
    for (const u of foes) { const d = hyp(u, s); if (d >= 2 && d <= rg && d < bd) { bd = d; best = u; } }
    const { c, cd } = nearestCastle(f, s);
    if (!best && c && cd <= rg) best = c;
    if (s.boat) best = null;
    if (!(s.fire > 0) && s.load < 1) s.load = Math.min(1, s.load + dt / RELOAD);
    if (best) {
      s.tx = s.x; s.tz = s.z;
      const da = env.turnTo(s, Math.atan2(best.x - s.x, best.z - s.z), dt, 2.6);
      if (da < 0.08 && s.load >= 1 && !(s.fire > 0)) fireBolt(s, best, f);
    } else if (c) advance(s, c, cd, 0.75);
    env.updateSoldierMovement(s, dt);
    animBallista(s, s.rig, dt);
  }
  /** slider back while drawing, snaps forward on the shot; limbs bend back with the draw and whip forward; the winch turns */
  function animBallista(s: any, r: any, dt: number) { if (r) animXbow(T, r, s, dt); }

  // ------------------------------------------------------------------------------------------------ bolts in flight
  const bolts: any[] = [];
  const tmp = new T.Vector3();
  function spawnBolt(from: any, ox: number, oy: number, oz: number, tg: any, dmg: number, foesFn: () => any[], castleHit: boolean) {
    const ty = (tg.y || 0) + (tg.isCastle ? 1.5 : 0.7), dx = tg.x - ox, dz = tg.z - oz, d = Math.hypot(dx, dz) || 1;
    const Tt = Math.max(0.12, d / BOLT_SPEED), vy = (ty - oy + 0.5 * BOLT_G * Tt * Tt) / Tt;
    const tiers: any[][] = [[], [], []];
    const m = new T.Group(); const p = boltParts(ctx);
    for (const q of p) { const mm = new T.Mesh(q.geo, q.mat); mm.castShadow = true; m.add(mm); }
    m.position.set(ox, oy, oz); env.scene.add(m);
    const b = { m, kind: "bolt", vx: dx / Tt, vy, vz: dz / Tt, t: 0, life: Tt + 0.8, hits: 0, hit: new Set(), dmg, stuck: 0, foesFn, castleHit, from };
    bolts.push(b);
    return b;
  }
  function fireBolt(s: any, tg: any, f: any) {
    const r = s.rig;
    s.load = 0; s.fire = 0.3;
    r.bolt.updateMatrixWorld(true); r.bolt.getWorldPosition(tmp);
    tmp.y += 0.05;
    spawnBolt(f, tmp.x, tmp.y, tmp.z, tg, BOLT_DMG, () => foesOf(f), true);
    try { if (env.wbFx) env.wbFx.launch(s, tmp.x, tmp.y, tmp.z, tg.x, tg.z); } catch { /* ignore */ }
  }
  function tickBolts(dt: number) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], P = b.m.position;
      if (b.stuck > 0) { b.stuck -= dt; if (b.stuck <= 0) { env.scene.remove(b.m); bolts.splice(i, 1); } continue; }
      b.t += dt; b.vy -= BOLT_G * dt;
      P.x += b.vx * dt; P.y += b.vy * dt; P.z += b.vz * dt;
      tmp.set(P.x + b.vx, P.y + b.vy, P.z + b.vz); b.m.lookAt(tmp);
      try { if (env.wbFx) env.wbFx.trail(b, dt); } catch { /* ignore */ }
      let stop = false;
      // the bolt runs through up to three people in a line
      for (const u of b.foesFn()) {
        if (b.hit.has(u)) continue;
        if (Math.abs(u.x - P.x) < 0.6 && Math.abs(u.z - P.z) < 0.6 && P.y < (u.y || 0) + (u.isSiege ? 2 : 1.7)) {
          b.hit.add(u); env.damageLegacyTarget({ attackPower: Math.round(b.dmg), isSiege: true, faction: b.from }, u); b.hits++; b.dmg *= 0.65;
          try { if (env.wbFx) env.wbFx.spark(P.x, P.y, P.z); } catch { /* ignore */ }
          if (b.hits >= 3) { stop = true; break; }
        }
      }
      if (!stop && b.castleHit) (env.legacyFactions || []).forEach((o: any) => {
        if (stop || o === b.from || o.defeated || !o.castle || !o.castle.alive) return;
        if (hyp(o.castle, P) < 2.2 && P.y < (o.castle.y || 0) + 3) { env.damageLegacyTarget({ attackPower: 6, isSiege: true }, o.castle); stop = true; try { env.wbFx && env.wbFx.spark(P.x, P.y, P.z); } catch { /* ignore */ } }
      });
      const gy = env.getGroundHeight(P.x, P.z);
      if (stop) { env.scene.remove(b.m); bolts.splice(i, 1); continue; }
      if (P.y <= gy + 0.15 || b.t > b.life) { P.y = Math.max(P.y, gy + 0.25); b.stuck = 4; try { env.spawnShards(P.x, gy + 0.2, P.z, 0x7a6a50); } catch { /* ignore */ } }   // stuck in the ground for a while
    }
  }

  // ------------------------------------------------------------------------------------------------ engine hooks
  env.updateSiegeUnits = function (faction: any, dt: number) {
    if (faction.defeated) return;
    const foes = foesOf(faction);
    faction.siegeUnits.forEach((s: any) => {
      if (!s.alive) return;
      try { if (s.kind === "ballista") ballistaTick(s, faction, foes, dt); else catapultTick(s, faction, foes, dt); }
      catch (e) { console.error("siege tick", e); }
    });
  };
  const origImpact = env.boulderImpact;
  env.boulderImpact = function (p: any) {
    origImpact(p);
    const inf = env.wbInf;
    if (inf && inf.on && p.from && p.from.isPlayer) {
      const x = p.m.position.x, z = p.m.position.z;
      inf.z.forEach((zb: any) => { if (zb.alive && Math.hypot(zb.x - x, zb.z - z) < 2.4) env.damageLegacyTarget({ attackPower: 26, isSiege: true }, zb); });
    }
  };
  const origUpd = env.updateLegacy;
  env.updateLegacy = function (dt: number, st: number) {
    const r = origUpd(dt, st);
    try { const d = Math.min(dt, 0.1); tickBolts(d); tickDecks(d); } catch (e) { console.error("siege bolts", e); }
    return r;
  };
  // a new game starts with no bolts lying about
  const origInit = env.initLegacyMode;
  env.initLegacyMode = function () { bolts.splice(0).forEach((b) => env.scene.remove(b.m)); return origInit.apply(this, arguments); };

  // the Workshop: the crossbow button builds a giant crossbow
  const origWorkshop = env.openWorkshopMenu;
  env.openWorkshopMenu = function (pf: any) {
    origWorkshop(pf);
    const b = document.getElementById("wb-crossbow");
    if (!b) return;
    b.innerHTML = 'Giant Crossbow <span class="lb-cost">' + GIANT_CROSSBOW_COST + " iron</span>";
    const note = b.parentElement && b.parentElement.nextElementSibling;
    if (note) note.textContent = "Giant crossbow: a siege engine that fires huge bolts through enemy troops. Catapult: hurls boulders at castles and at groups of troops.";
    b.onclick = function () {
      if ((pf.iron || 0) < GIANT_CROSSBOW_COST) { env.showWorldWarning("Need " + GIANT_CROSSBOW_COST + " iron for a giant crossbow.", 3000); return; }
      const terr = env.getTerritoryById(pf.territoryId);
      if (!terr) return;
      pf.iron -= GIANT_CROSSBOW_COST;
      const a = Math.random() * Math.PI * 2, rr = Math.random() * Math.max(1, terr.radius - 4);
      nextKind = "ballista";
      try { const s = env.makeSiegeUnit(terr.center.x + Math.cos(a) * rr, terr.center.z + Math.sin(a) * rr, pf.color, pf); pf.siegeUnits.push(s); }
      finally { nextKind = null; }
      env.showWorldWarning("Giant crossbow deployed!", 3000);
      env.updateLegacyHUD();
    };
  };

  // ------------------------------------------------------------------------------------------------ Infinite watchtowers: the deck crossbow follows the nearest zombie and kicks when the tower shoots
  function tickDecks(dt: number) {
    const I = env.iife; if (!I || !I.defs) return;
    const inf = env.wbInf, zs = inf && inf.on ? inf.z : [];
    for (const d of I.defs) {
      const x = d.mesh && d.mesh.userData && d.mesh.userData.deckXbow;
      if (!x) continue;
      let best: any = null, bd = 14;
      for (const z of zs) { if (!z.alive) continue; const k = Math.hypot(z.x - d.x, z.z - d.z); if (k < bd) { bd = k; best = z; } }
      if (best) {
        const want = Math.atan2(best.x - d.x, best.z - d.z) - (d.mesh.rotation.y || 0);
        let dy = want - x.yaw.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        x.yaw.rotation.y += dy * Math.min(1, dt * 6);
      }
      if (x.lastCd != null && d.cd > x.lastCd + 0.2) { x.fire = 0.3; x.load = 0; }
      x.lastCd = d.cd;
      x.load = x.fire > 0 ? 0 : Math.min(1, (x.load || 0) + dt / 0.6);
      animBallista(x, x, dt);
    }
  }

  return { foesOf, spawnBolt, tickBolts, bolts };
}
