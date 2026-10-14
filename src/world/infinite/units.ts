// @ts-nocheck
import type { Ctx } from "./types";
import { Rng, clamp } from "./rng";
import { randomLook, humanParts, instantiate, setTier, armourSet, shieldParts, swordParts, spearParts, crossbowParts, type Look } from "./humans";
import { zombieLook, zombieParts, randomGait, type Gait } from "./zombies";
import { glowTexture } from "./tex";

/**
 * People of the Infinite world: your king and helpers get real names on plates and detailed models with proper armour pieces; zombies
 * get rotten models and each walks in its own way. A golden halo (with a light beam) marks the soldier you are upgrading in the Armory
 * and whoever just received an iron upgrade.
 */
const EXTRA_NAMES = ["Anwen", "Bram", "Calla", "Doran", "Esme", "Fenn", "Greta", "Hale", "Ines", "Joss", "Kira", "Lorn", "Mara", "Nico", "Odette", "Perrin", "Raya", "Soren",
  "Talia", "Ulric", "Vera", "Wystan", "Xena", "Yorick", "Zora", "Ash", "Briar", "Cedar", "Dune", "Ember", "Fern", "Garnet", "Hazel", "Iris", "Jade", "Kai", "Lark", "Moss", "Nettle", "Olive"];

function disposeDeep(o: any) {
  o.traverse((n: any) => {
    if (n.isSprite) { if (n.material.map && n.material.map.userData.own) n.material.map.dispose(); n.material.dispose(); }
  });
}

export function installUnits(ctx: Ctx) {
  const env = ctx.env, T = ctx.T;
  let registry: any[] = [];
  let deck: string[] = [];
  let spawned = 0;
  const zPool: any[] = [];   // a dozen zombie bodies, shared by all zombies
  const hPool: any[] = [];   // a handful of looks for helpers
  const plateCache = new Map<string, any>();
  const glow = glowTexture(T);

  // ------------------------------------------------------------------------------------------------ names and plates
  function drawName(): string {
    if (!deck.length) {
      deck = (env.VILLAGER_NAMES as string[]).concat(EXTRA_NAMES);
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j]!, deck[i]!]; }
    }
    const n = deck.pop()!;
    return spawned++ >= 65 ? n + " " + ["II", "III", "IV", "V", "VI"][Math.min(4, Math.floor(spawned / 65) - 1)] : n;
  }
  function plateTexture(name: string, king: boolean) {
    const key = name + (king ? "#k" : "");
    let t = plateCache.get(key);
    if (t) return t;
    const c = document.createElement("canvas"); c.width = 256; c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = king ? "rgba(48,36,10,0.86)" : "rgba(10,14,22,0.8)";
    g.strokeStyle = king ? "#f0c040" : "rgba(255,255,255,0.42)"; g.lineWidth = king ? 4 : 3;
    const r = 18, w = 252, h = 60, x = 2, y = 2;
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); g.stroke();
    g.font = "700 30px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 5; g.strokeStyle = "rgba(0,0,0,0.6)";
    const label = king ? "\u{1F451} " + name : name;
    g.strokeText(label, 128, 33); g.fillStyle = king ? "#ffe9a0" : "#ffffff"; g.fillText(label, 128, 33);
    t = new T.CanvasTexture(c); t.userData.own = true; t.colorSpace = T.SRGBColorSpace;
    plateCache.set(key, t);
    return t;
  }
  function makePlate(name: string, king: boolean) {
    const m = new T.SpriteMaterial({ map: plateTexture(name, king), transparent: true, depthTest: false, depthWrite: false });
    const sp = new T.Sprite(m);
    sp.renderOrder = 998; sp.center.set(0.5, 0);
    return sp;
  }

  // ------------------------------------------------------------------------------------------------ halos
  const halos: any[] = [];
  let focused: any = null;
  const haloGeo = { ring: new T.TorusGeometry(0.2, 0.024, 8, 30), ring2: new T.TorusGeometry(0.13, 0.014, 6, 24), beam: new T.CylinderGeometry(0.1, 0.22, 4.5, 14, 1, true) };
  haloGeo.ring.rotateX(Math.PI / 2); haloGeo.ring2.rotateX(Math.PI / 2);
  const haloMat = new T.MeshBasicMaterial({ color: 0xffd24a, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95, fog: false });
  const beamMat = new T.MeshBasicMaterial({ color: 0xffd860, depthTest: false, depthWrite: false, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false });
  function makeHalo(u: any, mode: string, life: number) {
    const g = new T.Group();
    const r1 = new T.Mesh(haloGeo.ring, haloMat), r2 = new T.Mesh(haloGeo.ring2, haloMat);
    const gl = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0xffd24a, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.85 }));
    gl.scale.set(0.9, 0.9, 1);
    const bm = new T.Mesh(haloGeo.beam, beamMat); bm.position.y = 2.25;
    [r1, r2, gl, bm].forEach((o: any) => { o.renderOrder = 997; });
    g.add(r1, r2, gl, bm);
    g.position.y = 1.34;
    u.group.add(g);
    const h = { g, r1, r2, gl, bm, unit: u, mode, life, t: 0 };
    halos.push(h);
    return h;
  }
  function dropHalo(h: any) {
    const i = halos.indexOf(h); if (i >= 0) halos.splice(i, 1);
    if (h.g.parent) h.g.parent.remove(h.g);
    h.gl.material.dispose();
  }
  const halo = {
    focus(u: any) {
      if (focused && focused.unit === u && halos.indexOf(focused) >= 0) return;
      if (focused) dropHalo(focused);
      focused = u && u.group ? makeHalo(u, "select", 1e9) : null;
    },
    flash(u: any, secs = 6) { if (u && u.group) makeHalo(u, "flash", secs); },
    clear() { halos.slice().forEach(dropHalo); focused = null; },
    update(dt: number) {
      for (let i = halos.length - 1; i >= 0; i--) {
        const h = halos[i];
        h.t += dt; h.life -= dt;
        if (!h.unit.alive || !h.unit.group || h.life <= 0) { dropHalo(h); if (focused === h) focused = null; continue; }
        const pulse = 0.5 + 0.5 * Math.sin(h.t * 4.2);
        h.r1.rotation.y += dt * 1.6; h.r2.rotation.y -= dt * 2.4;
        h.g.position.y = 1.34 + Math.sin(h.t * 2.6) * 0.04;
        const s = 0.8 + 0.25 * pulse; h.gl.scale.set(s, s, 1);
        const fade = h.mode === "flash" ? clamp(Math.min(h.life, h.t * 3), 0, 1) : 1;
        h.bm.scale.set(1, 1, 1); h.gl.material.opacity = 0.85 * fade;
      }
      haloMat.opacity = 0.95; beamMat.opacity = 0.14 + 0.08 * (0.5 + 0.5 * Math.sin(ctx.rtime * 3));
    },
  };
  ctx.x.halo = halo;

  // ------------------------------------------------------------------------------------------------ building a person
  function pivot(x: number, y: number, z = 0) { const g = new T.Group(); g.position.set(x, y, z); return g; }
  function buildBody(s: any, parts: any, bw: number, tiers: any[]) {
    const g = s.group;
    const body = pivot(0, 0.4), headP = pivot(0, 0.4), armLP = pivot(-0.205 * bw, 0.33), armRP = pivot(0.205 * bw, 0.33);
    const legLP = pivot(-0.085, 0.4), legRP = pivot(0.085, 0.4);
    const torso = instantiate(ctx, parts.torso, tiers), head = instantiate(ctx, parts.head, tiers);
    body.add(torso); headP.add(head); body.add(headP);
    armLP.add(instantiate(ctx, parts.armL, tiers)); armRP.add(instantiate(ctx, parts.armR, tiers));
    body.add(armLP, armRP);
    legLP.add(instantiate(ctx, parts.legL, tiers)); legRP.add(instantiate(ctx, parts.legR, tiers));
    g.add(body, legLP, legRP);
    // an invisible capsule so the whole body can be clicked, plus the head
    const proxy = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, 1.1, 6), new T.MeshBasicMaterial({ visible: false }));
    proxy.position.y = 0.55; proxy.userData.owner = s; proxy.userData.proxy = true;
    const headHit = new T.Mesh(new T.SphereGeometry(0.16, 6, 5), new T.MeshBasicMaterial({ visible: false }));
    headHit.position.y = 0.95; headHit.userData.owner = s;
    g.add(proxy, headHit);
    s.pickables = [proxy, headHit]; s.proxies = [proxy, headHit];
    s.torso = proxy; s.body = proxy; s.head = headHit;
    torso.traverse((m: any) => { if (m.isMesh) m.userData.owner = s; });
    head.traverse((m: any) => { if (m.isMesh) m.userData.owner = s; });
    s.legL = legLP; s.legR = legRP; s.armL = armLP; s.armR = armRP;
    s.rigX = { body, headP, armLP, armRP, legLP, legRP, torso, head, bw };
    return s.rigX;
  }

  function dress(s: any, name: string, isPlayer: boolean, color: number) {
    const g = s.group, zombie = name === "Zombie";
    const keep = new Set([s.ring, s.hbSprite]);
    g.children.slice().forEach((c: any) => { if (keep.has(c)) return; g.remove(c); c.traverse((n: any) => { if (n.geometry) n.geometry.dispose(); if (n.material) { if (n.map) n.map.dispose(); n.material.dispose(); } }); });
    const tiers: any[] = [];
    s.tierRoots = tiers;
    const rnd = new Rng((Math.random() * 1e9) | 0);
    if (zombie) {
      if (!zPool.length) for (let i = 0; i < 14; i++) zPool.push(zombieLook(new Rng(1000 + i * 37), false));
      const Z = zPool[Math.floor(Math.random() * zPool.length)]!;
      const parts = zombieParts(ctx, Z);
      const R = buildBody(s, parts, Z.build, tiers);
      const wave = env.wbInf && env.wbInf.q ? env.wbInf.q.wave : 1;
      s.gait = randomGait(rnd, wave, false);
      s.zLook = Z;
      R.body.scale.set(Z.build * rnd.range(0.92, 1.08), rnd.range(0.94, 1.1), Z.build);
      s.speedBase = null;
      if (s.hbSprite) s.hbSprite.position.y = 1.32;
      s.noPlate = true;
    } else {
      let L: Look;
      if (isPlayer) L = randomLook(new Rng(77), 0x2f5fb8, { crown: true, cape: true });
      else {
        if (hPool.length < 9) hPool.push(randomLook(new Rng(5000 + hPool.length * 131), color));
        L = hPool[Math.floor(Math.random() * hPool.length)]!;
      }
      const parts = humanParts(ctx, L);
      const R = buildBody(s, parts, L.build, tiers);
      s.look = L;
      // sword in the right hand (blade forward); dummies stand in for the parts the original rig expects
      const sw = instantiate(ctx, swordParts(ctx, !!isPlayer), tiers);
      sw.position.set(0, -0.33, 0.03); sw.rotation.x = 0.25;
      R.armRP.add(sw);
      s.sword = sw; s.swordGuard = new T.Object3D(); s.shield = new T.Object3D(); s.shieldRim = new T.Object3D(); s.helmet = new T.Object3D();
      if (s.hbSprite) s.hbSprite.position.y = 1.38;
      const plate = makePlate(isPlayer ? "You" : name, isPlayer);
      plate.position.y = 1.55; g.add(plate);
      s.plate = plate; s.tagMat = plate.material;
      if (isPlayer) { s.ring.visible = true; }
    }
    registry.push(s);
    // current graphics level
    tiers.forEach((t) => setTier(t, ctx.gfx.f.tier));
  }

  // wrap makeSoldier: everything the engine creates while the Infinite world runs gets the new look
  const origMake = env.makeSoldier;
  env.makeSoldier = function (x: number, z: number, color: number, isPlayer: boolean, name: string, faction: any) {
    const inf = ctx.isInf();
    let nm = name;
    if (inf && !isPlayer && name !== "Zombie" && !(faction && faction.id === "zombie")) nm = drawName();
    const s = origMake(x, z, color, isPlayer, nm, faction);
    if (!inf) return s;
    try { dress(s, name === "Zombie" ? "Zombie" : nm, !!isPlayer, color); } catch (e) { console.error("unit model", e); }
    return s;
  };

  // ------------------------------------------------------------------------------------------------ walking and fighting
  const origAnim = env.animRig;
  const tmpT = () => performance.now() / 1000;
  env.animRig = function (s: any, moved: number, dt: number) {
    const R = s && s.rigX;
    if (!R || !ctx.isInf()) return origAnim(s, moved, dt);
    const g: Gait | null = s.gait || null;
    const sp = moved / Math.max(dt, 0.001);
    const tg = s.boat ? 0 : Math.min(1, sp / Math.max((s.speed || 1) * (g ? g.speedMul : 1), 0.1));
    s.amp = (s.amp || 0) + (tg - (s.amp || 0)) * Math.min(1, dt * 10);
    s.ph = (s.ph || 0) + moved * (g ? g.cadence : 5.5);
    const t = tmpT(), amp = s.amp, sw = Math.sin(s.ph) * amp;
    const seed = s.id || (s.id = Math.random() * 100);
    if (g) animZombie(s, R, g, sw, amp, t, dt); else animHuman(s, R, sw, amp, t, dt, seed);
  };
  function animHuman(s: any, R: any, sw: number, amp: number, t: number, dt: number, seed: number) {
    const { body, headP, armLP, armRP, legLP, legRP } = R;
    legLP.rotation.x = sw * 0.85; legRP.rotation.x = -sw * 0.85;
    armLP.rotation.x = -sw * 0.6; armRP.rotation.x = sw * 0.6;
    armLP.rotation.z = 0.06; armRP.rotation.z = -0.06;
    body.rotation.x = 0.07 * amp; body.rotation.z = 0; body.rotation.y = 0;
    const idle = 1 - amp;
    body.scale.y = 1 + 0.012 * Math.sin(t * 1.8 + seed);
    headP.rotation.y = Math.sin(t * 0.55 + seed) * 0.28 * idle; headP.rotation.x = -0.04 * amp;
    if (s.hasCrossbow) { armLP.rotation.x = -1.2; armRP.rotation.x = -1.1; armLP.rotation.z = -0.35; armRP.rotation.z = 0.35; }
    if (s.swing > 0) {
      s.swing -= dt;
      const k = 1 - Math.max(0, s.swing) / 0.35;
      if (s.hasSpear) { armRP.rotation.x = -1.2 - Math.sin(k * Math.PI) * 0.6; armRP.rotation.z = -0.1; body.rotation.x = 0.1 + Math.sin(k * Math.PI) * 0.25; }
      else if (!s.hasCrossbow) { armRP.rotation.x = -2.4 + 2.1 * k; body.rotation.x = 0.1 + Math.sin(k * Math.PI) * 0.22; body.rotation.y = -0.25 + 0.5 * k; }
    }
    s.bob = Math.abs(Math.cos(s.ph)) * 0.045 * amp;
  }
  function animZombie(s: any, R: any, g: Gait, sw: number, amp: number, t: number, dt: number) {
    const { body, headP, armLP, armRP, legLP, legRP } = R;
    const ph = s.ph + g.phase;
    let la = sw * g.legAmp, ra = -sw * g.legAmp;
    if (g.dragSide) { if (g.dragSide > 0) ra *= 0.4; else la *= 0.4; }
    legLP.rotation.x = la; legRP.rotation.x = ra;
    legLP.rotation.z = g.dragSide < 0 ? -0.12 * amp : 0; legRP.rotation.z = g.dragSide > 0 ? 0.12 * amp : 0;
    const reach = g.armPose, sway2 = Math.sin(ph) * g.armSwing * amp;
    armLP.rotation.x = -reach + sway2; armRP.rotation.x = -reach - sway2 * (g.kind === "limp" ? 0.2 : 1) + (g.kind === "limp" ? 0.9 : 0) + (g.kind === "stagger" ? 0.6 * Math.sin(ph * 0.5) : 0);
    armLP.rotation.z = 0.1 + 0.05 * Math.sin(t * 1.3 + g.phase); armRP.rotation.z = -0.1 - 0.05 * Math.sin(t * 1.1 + g.phase);
    const lean = g.lean * (0.55 + 0.45 * amp);
    body.rotation.x = lean;
    body.rotation.z = Math.sin(ph * 0.5) * g.sway * amp + (g.dragSide ? 0.07 * g.dragSide : 0);
    body.rotation.y = Math.sin(ph * 0.5 + 1) * g.sway * 0.6 * amp;
    body.position.y = 0.4 - g.crouch * (g.kind === "crawl" ? 1 : 0);
    // head lolls and lags behind the body; every so often a twitch
    const tw = Math.max(0, Math.sin(t * 2.3 + g.phase * 5) * Math.sin(t * 0.7 + g.phase)) > 0.82 ? 1 : 0;
    headP.rotation.x = -lean * 0.8 + 0.12 * Math.sin(t * 1.6 + g.phase) + tw * 0.25 * g.twitch;
    headP.rotation.z = Math.sin(t * 1.1 + g.phase) * 0.14 + (g.kind === "stagger" ? Math.sin(ph) * g.headLag * amp : 0) + tw * 0.3 * g.twitch;
    headP.rotation.y = Math.sin(t * 0.7 + g.phase) * 0.3 * (1 - amp);
    if (g.kind === "crawl") { armLP.rotation.x = -2.5 + Math.sin(ph) * 0.6; armRP.rotation.x = -2.5 - Math.sin(ph) * 0.6; legLP.rotation.x = 0.3 + sw * 0.3; legRP.rotation.x = 0.3 - sw * 0.3; }
    if (s.swing > 0) {
      s.swing -= dt; const k = 1 - Math.max(0, s.swing) / 0.35;
      armLP.rotation.x = -1.7 + Math.sin(k * Math.PI * 2) * 0.8; armRP.rotation.x = -1.7 - Math.sin(k * Math.PI * 2) * 0.8;
      body.rotation.x = lean + 0.25 * Math.sin(k * Math.PI);
    }
    s.bob = Math.abs(Math.cos(s.ph)) * g.bob * amp;
  }

  // ------------------------------------------------------------------------------------------------ equipment
  function attach(s: any, parts: any, plume = 0xc03030) {
    const R = s.rigX, tiers = s.tierRoots;
    const set = armourSet(ctx, s.look, plume);
    const add = (p: any, host: any) => { const grp = instantiate(ctx, p, tiers); host.add(grp); return grp; };
    R.torso.add(instantiate(ctx, set.torso, tiers)); add(set.head, R.headP); add(set.armL, R.armLP); add(set.armR, R.armRP); add(set.legL, R.legLP); add(set.legR, R.legRP);
  }
  const origArmor = env.addArmorVisual;
  env.addArmorVisual = function (s: any) {
    if (!ctx.isInf() || !s || !s.rigX || !s.look) return origArmor(s);
    if (s.armorMesh) return;
    s.armorMesh = new T.Object3D();
    attach(s, null, s.look.trim === 0xd8c070 ? 0xc03030 : s.look.trim);
  };
  const origShield = env.addShieldVisual;
  env.addShieldVisual = function (s: any) {
    const had = s && s.hasShield;
    origShield(s);
    if (!ctx.isInf() || !s || !s.rigX || had) return;
    const g = instantiate(ctx, shieldParts(ctx, s.faction ? s.faction.color : 0x4f8fd6, s.look ? s.look.trim : 0xd8c070), s.tierRoots);
    g.position.set(-0.075, -0.17, 0.09); g.rotation.set(0, -0.75, 0);
    s.rigX.armLP.add(g); s.shieldMesh = g;
  };
  const origSpear = env.addSpearVisual;
  env.addSpearVisual = function (s: any) {
    const had = s && s.hasSpear;
    origSpear(s);
    if (!ctx.isInf() || !s || !s.rigX || had) return;
    [s.spearShaft, s.spearTip].forEach((m: any) => { if (m && m.parent) m.parent.remove(m); });
    const g = instantiate(ctx, spearParts(ctx, s.faction ? s.faction.color : 0x4f8fd6), s.tierRoots);
    g.position.set(0, -0.32, 0.04); g.rotation.x = -Math.PI / 2 + 0.2;     // held upright in front
    s.rigX.armRP.add(g); s.spearMesh = g;
  };
  const origBow = env.addCrossbowVisual;
  env.addCrossbowVisual = function (s: any) {
    const had = s && s.hasCrossbow;
    origBow(s);
    if (!ctx.isInf() || !s || !s.rigX || had) return;
    [s.bowStock, s.bowLimb, s.bowString].forEach((m: any) => { if (m && m.parent) m.parent.remove(m); });
    const cb = crossbowParts(ctx), mount = new T.Group();
    mount.position.set(0.02, 0.2, 0.14); s.rigX.body.add(mount);
    const stock = instantiate(ctx, cb.stock, s.tierRoots), limb = instantiate(ctx, cb.limb, s.tierRoots), str = instantiate(ctx, cb.string, s.tierRoots);
    stock.position.z = 0.1; limb.position.z = 0.15; str.position.z = 0.22;       // the engine's recoil effect moves these three
    mount.add(stock, limb, str);
    s.bowStock = stock; s.bowLimb = limb; s.bowString = str; s.bowMount = mount;
  };
  const origBig = env.upgradeSwordVisual;
  env.upgradeSwordVisual = function (s: any) {
    const had = !!s.bigSwordMesh;
    origBig(s);
    if (!ctx.isInf() || !s || !s.rigX || had) return;
    if (s.bigSwordMesh && s.bigSwordMesh.parent) s.bigSwordMesh.parent.remove(s.bigSwordMesh);
    if (s.sword && s.sword.parent) s.sword.parent.remove(s.sword);
    const g = instantiate(ctx, swordParts(ctx, true), s.tierRoots);
    g.position.set(0, -0.33, 0.03); g.rotation.x = 0.25;
    s.rigX.armRP.add(g); s.sword = g; s.bigSwordMesh = g;
  };

  // iron upgrades handed out by mines: show who got one
  const origGrant = env.grantIronUpgrade;
  env.grantIronUpgrade = function (faction: any) {
    if (!ctx.isInf()) return origGrant(faction);
    const before = faction.units.map((u: any) => [u, !!u.hasArmor, !!u.hasSword]);
    const r = origGrant(faction);
    for (const [u, a, w] of before) {
      if (u.hasArmor && !a) { halo.flash(u, 7); env.showWorldWarning(u.name + " was fitted with iron armour!", 4000); break; }
      if (u.hasSword && !w) { halo.flash(u, 7); env.showWorldWarning(u.name + " was given a better sword!", 4000); break; }
    }
    return r;
  };

  // ------------------------------------------------------------------------------------------------ the Armory: pick a soldier by name, see the halo
  let lastPick = "";
  const origArmory = env.openArmoryMenu;
  env.openArmoryMenu = function (pf: any) {
    if (!ctx.isInf()) return origArmory(pf);
    origArmory(pf);
    const sel = document.getElementById("armory-unit-select") as HTMLSelectElement | null;
    if (!sel) { halo.focus(null); return; }
    const units = pf.units.filter((u: any) => u.alive && u !== env.legacyPlayer);
    Array.from(sel.options).forEach((o, i) => {
      const u = units[i]; if (!u) return;
      const eq = [u.hasArmor && "armour", u.hasShield && "shield", u.hasSpear && "spear", u.hasCrossbow && "crossbow", u.hasSword && "great sword"].filter(Boolean).join(", ");
      o.textContent = (i + 1) + ". " + u.name + " — " + (eq || "no gear yet");
    });
    const idx = Math.max(0, units.findIndex((u: any) => u.name === lastPick));
    if (units.length) sel.value = String(idx);
    const pick = () => { const u = units[parseInt(sel.value || "0", 10)]; if (u) { lastPick = u.name; halo.focus(u); } };
    sel.addEventListener("change", pick);
    pick();
    const find = document.createElement("button");
    find.type = "button"; find.className = "legacy-build-btn"; find.id = "ar-find"; find.textContent = "\u{1F4CD} Find";
    find.title = "Move the camera to the selected soldier";
    find.onclick = () => { const u = units[parseInt(sel.value || "0", 10)]; if (u) env.camTarget.set(u.x, 0, u.z); };
    const close = document.getElementById("ar-close");
    if (close && close.parentNode) close.parentNode.insertBefore(find, close);
    const hint = document.createElement("div");
    hint.style.cssText = "margin-top:4px;font-size:11px;color:var(--muted)";
    hint.textContent = "The golden halo shows who you are equipping.";
    sel.parentNode && sel.parentNode.appendChild(hint);
  };

  // zombies fall over instead of blinking out
  const deaths: any[] = [];
  const origKill = env.killLegacyUnit;
  env.killLegacyUnit = function (u: any) {
    const g = u && u.group, z = u && u.zombie && u.rigX && ctx.isInf();
    const r = origKill(u);
    if (z && g) {
      if (u.hbSprite) u.hbSprite.visible = false;
      env.scene.add(g);
      deaths.push({ u, g, t: 0, side: Math.random() < 0.5 ? -1 : 1 });
    }
    return r;
  };

  // at dawn the zombies crumble to dust in the first light instead of blinking out
  const dissolves: any[] = [];
  const origClearZ = env.wbInfClearZ;
  env.wbInfClearZ = function () {
    if (!ctx.isInf() || (ctx as any).stopping || !env.wbInf.on) return origClearZ();
    const live = (env.wbInf.z || []).filter((z: any) => z.alive && z.group && z.rigX && z.group.parent);
    const r = origClearZ();
    for (const u of live.slice(0, 40)) {
      if (u.hbSprite) u.hbSprite.visible = false;
      env.scene.add(u.group);
      dissolves.push({ u, g: u.group, t: 0, dust: Math.random() * 0.3, x: u.group.position.x, z: u.group.position.z, spin: Math.random() < 0.5 ? -1 : 1 });
    }
    return r;
  };

  // ------------------------------------------------------------------------------------------------ per frame
  function frame(dt: number) {
    halo.update(dt);
    for (let i = dissolves.length - 1; i >= 0; i--) {
      const d = dissolves[i], R = d.u.rigX; d.t += dt;
      const k = clamp(d.t / 1.8, 0, 1);
      if (R) {
        R.body.rotation.z = Math.sin(d.t * 26) * 0.07 * (1 - k) * d.spin;                 // a shudder as the light touches it
        R.headP.rotation.x = -0.6 * k; R.armLP.rotation.x = -1.6 + 0.4 * Math.sin(d.t * 18); R.armRP.rotation.x = -1.6 - 0.4 * Math.sin(d.t * 17);
      }
      d.g.scale.y = 1 - 0.85 * k * k; d.g.position.y -= dt * 0.12 * k;
      d.dust -= dt;
      if (d.dust <= 0 && ctx.fx && k < 0.95) { d.dust = 0.12; ctx.fx.dust(d.x, d.g.position.y + 0.3 + 0.8 * (1 - k), d.z, 0.7); }
      if (d.t > 2.0) { env.scene.remove(d.g); dissolves.splice(i, 1); }
    }
    const d = env.camDistance, k = clamp(d * 0.036, 0.22, 5);   // plates keep about the same size on screen at any zoom
    for (let i = registry.length - 1; i >= 0; i--) {
      const s = registry[i];
      if (!s.alive) { registry.splice(i, 1); continue; }
      if (s.plate) {
        const vis = d < 125;
        s.plate.visible = vis;
        if (vis) { s.plate.scale.set(k * 4, k, 1); s.plate.position.y = 1.5 + (focused && focused.unit === s ? 0.35 : 0); }
      }
      // zombies hidden in fog stay hidden; boss gets its own look
      if (s.zombie && s.boss && !s.bossStyled) restyleBoss(s);
    }
    for (let i = deaths.length - 1; i >= 0; i--) {
      const dd = deaths[i]; dd.t += dt;
      const R = dd.u.rigX, k2 = clamp(dd.t / 0.55, 0, 1);
      R.body.rotation.x = -Math.PI / 2 * k2 * 0.95; R.body.rotation.z = dd.side * 0.3 * k2;
      R.body.position.y = 0.4 - 0.25 * k2; R.legLP.rotation.x = 0.4 * k2; R.legRP.rotation.x = -0.2 * k2;
      R.armLP.rotation.x = -2.4 * k2; R.armRP.rotation.x = -1.8 * k2;
      if (dd.t > 1.4) { const s2 = clamp(1 - (dd.t - 1.4) / 0.8, 0, 1); dd.g.scale.set(dd.g.scale.x, dd.g.scale.y, dd.g.scale.z); dd.g.position.y -= dt * 0.35; }
      if (dd.t > 2.2) { env.scene.remove(dd.g); deaths.splice(i, 1); }
    }
  }
  function restyleBoss(s: any) {
    s.bossStyled = true;
    try {
      const g = s.group, R = s.rigX;
      [R.body, R.legLP, R.legRP, ...(s.proxies || [])].forEach((o: any) => g.remove(o));
      const rnd = new Rng(7), Z = zombieLook(rnd, true), parts = zombieParts(ctx, Z);
      const tiers: any[] = []; s.tierRoots = tiers;
      buildBody(s, parts, Z.build, tiers);
      s.gait = randomGait(rnd, 1, true);
      tiers.forEach((t) => setTier(t, ctx.gfx.f.tier));
    } catch (e) { console.error("boss look", e); }
  }

  return {
    startRun() { registry = []; deck = []; spawned = 0; lastPick = ""; deaths.length = 0; dissolves.length = 0; halo.clear(); },
    frame, halo,
    applyGfx() { registry.forEach((s: any) => s.tierRoots && s.tierRoots.forEach((t: any) => setTier(t, ctx.gfx.f.tier))); },
    registry: () => registry,
    stop() { halo.clear(); deaths.forEach((d) => env.scene.remove(d.g)); deaths.length = 0; dissolves.forEach((d) => env.scene.remove(d.g)); dissolves.length = 0; registry = []; },
    focusHalo: (u: any) => halo.focus(u),
  };
}
