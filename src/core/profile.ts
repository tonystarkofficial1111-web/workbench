import { Emitter, lsGetRaw, lsSetRaw } from "./store";
import { WB_SOUND } from "./sound";

/* ------------------------------------------------------------------ *
 * Player profile — persisted at localStorage 'wb_profile' (same shape  *
 * as the original app so existing saves carry over).                   *
 * ------------------------------------------------------------------ */

export interface FightRecord {
  wins: number;
  losses: number;
  draws: number;
  kos: number;
  fights: number;
}
export type HighScores = Record<string, Record<string, number>>;

export interface Profile {
  version: number;
  name: string;
  bio: string;
  avatar: string;
  createdAt: number;
  secondsOnPage: number;
  gamesPlayed: number;
  firstGamePlayedAt: number | null;
  achievements: Record<string, number>;
  arcade: Record<string, FightRecord>;
  highScores: HighScores;
  specialAchievements: Record<string, boolean>;
  gamesPlayedByType?: Record<string, number>;
  theme?: string;
  coins?: number;
  favorites?: string[];
  recents?: string[];
  difficulty?: string;
  usedSearch?: boolean;
  totalPoints?: number;
  updatedAt?: number;
  [k: string]: any;
}

const emptyRecord = (): FightRecord => ({ wins: 0, losses: 0, draws: 0, kos: 0, fights: 0 });

/** Games that exist in a fresh profile's `arcade` table. */
const DEFAULT_ARCADE_KEYS = [
  "rooftopRumble", "circuitRacer", "neonBreaker", "starfallDefender", "circuitSnake", "neonPong",
  "meteorCommand", "stackSurge", "botDefense", "crystalGarden", "memoryMatch", "colorMixer",
  "fishingHole", "dotConnect", "slidingPuzzle", "patternMemory", "towerBuilder", "bubbleSort",
  "idleFarm", "laserDodge", "ninjaDash", "orbCatcher", "bladeSlice", "gravityFlip", "bulletStorm",
  "platformJumper", "pixelRunner", "chainReactor", "rocketDash",
];

export function defaultHighScores(): HighScores {
  const eno = () => ({ easy: 0, normal: 0, hard: 0 });
  const hs: HighScores = {
    neonBreaker: { normal: 0, hard: 0, extreme: 0 },
    starfallDefender: { normal: 0, hard: 0, survival: 0 },
    circuitSnake: { normal: 0, walls: 0, speed: 0 },
    neonPong: { easy: 0, normal: 0, hard: 0 },
    meteorCommand: { normal: 0, hard: 0, survival: 0 },
    stackSurge: { normal: 0, speed: 0, zen: 0 },
  };
  for (const k of [
    "botDefense", "crystalGarden", "memoryMatch", "colorMixer", "fishingHole", "dotConnect",
    "slidingPuzzle", "patternMemory", "towerBuilder", "bubbleSort", "idleFarm", "laserDodge",
    "ninjaDash", "orbCatcher", "bladeSlice", "gravityFlip", "bulletStorm", "platformJumper",
    "pixelRunner", "chainReactor", "rocketDash",
  ]) hs[k] = eno();
  return hs;
}

export function defaultProfile(): Profile {
  const arcade: Record<string, FightRecord> = {};
  for (const k of DEFAULT_ARCADE_KEYS) arcade[k] = emptyRecord();
  return {
    version: 2,
    name: "Guest",
    bio: "",
    avatar: "",
    createdAt: Date.now(),
    secondsOnPage: 0,
    gamesPlayed: 0,
    firstGamePlayedAt: null,
    achievements: {},
    arcade,
    highScores: defaultHighScores(),
    specialAchievements: {},
  };
}

function loadProfile(): Profile {
  try {
    const saved = lsGetRaw("wb_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && parsed.arcade && parsed.arcade.rooftopRumble) return parsed;
    }
  } catch {
    /* fall through */
  }
  return defaultProfile();
}

let profile: Profile = loadProfile();

/** Fires after any profile mutation that should re-render profile-driven UI. */
export const profileEvents = new Emitter();
/** Fires once per second while the page is open (time tracker). */
export const tickEvents = new Emitter();

export function getProfile(): Profile {
  return profile;
}

export function saveProfile() {
  try {
    lsSetRaw("wb_profile", JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

/** Save and notify subscribers. */
export function commitProfile() {
  saveProfile();
  profileEvents.emit();
}

export function replaceProfile(p: Profile) {
  profile = p;
  saveProfile();
  ensureProfileShape();
  checkAchievements();
  profileEvents.emit();
}

export function resetProfile() {
  replaceProfile(defaultProfile());
}

export function ensureProfileShape() {
  const p = profile;
  if (!p.highScores) p.highScores = defaultHighScores();
  if (!p.theme) p.theme = "default";
  if (!p.bio) p.bio = "";
  if (!p.avatar) p.avatar = "";
  if (typeof p.secondsOnPage !== "number") p.secondsOnPage = 0;
  if (typeof p.gamesPlayed !== "number") p.gamesPlayed = 0;
  if (!p.achievements) p.achievements = {};
  if (!p.arcade) p.arcade = {};
  const dhs = defaultHighScores();
  for (const k of DEFAULT_ARCADE_KEYS) {
    if (!p.arcade[k]) p.arcade[k] = emptyRecord();
    if (!p.highScores[k] && dhs[k]) p.highScores[k] = dhs[k]!;
  }
  if (!p.specialAchievements) p.specialAchievements = {};
}

/* ----------------------------- scoring ----------------------------- */

export const scoreRules = {
  multipliers: { easy: 0.5, simple: 0.5, normal: 1, hard: 2, extreme: 3, survival: 2, speed: 1.5, zen: 0.5, walls: 1.5 } as Record<string, number>,
  balance: { meteorCommand: 0.5 } as Record<string, number>,
};

export function calcWeightedScore(gameKey: string, mode: string, raw: number): number {
  const mult = scoreRules.multipliers[mode] || 1;
  const bal = scoreRules.balance[gameKey] || 1;
  return Math.round(raw * mult * bal);
}

type ScoreListener = (gameKey: string, mode: string, raw: number) => void;
const scoreListeners: ScoreListener[] = [];
/** Used by the daily-challenge tracker (original wrapped wbRecordGameScore). */
export function onGameScore(fn: ScoreListener) {
  scoreListeners.push(fn);
}

export function recordGameScore(gameKey: string, mode: string, rawScore: number) {
  ensureProfileShape();
  if (!profile.highScores[gameKey]) profile.highScores[gameKey] = {};
  const prev = profile.highScores[gameKey]![mode] || 0;
  if (rawScore > prev) profile.highScores[gameKey]![mode] = rawScore;
  checkAchievements();
  commitProfile();
  for (const l of scoreListeners) {
    try {
      l(gameKey, mode, rawScore);
    } catch {
      /* ignore */
    }
  }
}

export function recordFightResult(cabinetKey: string, result: "win" | "loss" | "draw" | string, isKO?: boolean) {
  let rec = profile.arcade[cabinetKey];
  if (!rec) rec = profile.arcade[cabinetKey] = emptyRecord();
  rec.fights++;
  if (result === "win") {
    rec.wins++;
    if (isKO) rec.kos++;
  } else if (result === "loss") rec.losses++;
  else rec.draws++;
  checkAchievements();
  commitProfile();
}

export function koRatioText(rec?: FightRecord): string {
  if (!rec || rec.wins === 0) return "—";
  return rec.kos + "/" + rec.wins + " (" + Math.round((rec.kos / rec.wins) * 100) + "%)";
}

export function trackGamePlayed(gameKey: string) {
  ensureProfileShape();
  profile.gamesPlayed = (profile.gamesPlayed || 0) + 1;
  if (!profile.firstGamePlayedAt) profile.firstGamePlayedAt = Date.now();
  if (!profile.gamesPlayedByType) profile.gamesPlayedByType = {};
  profile.gamesPlayedByType[gameKey] = (profile.gamesPlayedByType[gameKey] || 0) + 1;
  checkAchievements();
  commitProfile();
}

export function trackSpecialAchievement(key: string) {
  ensureProfileShape();
  if (!profile.specialAchievements) profile.specialAchievements = {};
  profile.specialAchievements[key] = true;
  checkAchievements();
  commitProfile();
}

/** Sum of every stored raw high score (used for banner tiers). */
export function totalHighScorePoints(p: Profile = profile): number {
  let t = 0;
  for (const gk of Object.keys(p.highScores || {})) for (const mk of Object.keys(p.highScores[gk]!)) t += p.highScores[gk]![mk] || 0;
  return t;
}

/** Best single raw high score across every game/mode. */
export function bestSingleScore(p: Profile = profile): number {
  let b = 0;
  for (const gk of Object.keys(p.highScores || {})) for (const mk of Object.keys(p.highScores[gk]!)) if ((p.highScores[gk]![mk] || 0) > b) b = p.highScores[gk]![mk]!;
  return b;
}

export function bestScoreFor(key: string): number {
  const m = profile.highScores?.[key];
  if (!m) return 0;
  let best = 0;
  for (const k of Object.keys(m)) if (m[k]! > best) best = m[k]!;
  return best;
}

/* ----------------------------- coins etc. ----------------------------- */

export function getCoins(): number {
  return (profile.coins = profile.coins || 0);
}
export function addCoins(n: number) {
  profile.coins = (profile.coins || 0) + n;
  commitProfile();
  WB_SOUND.coin();
}
export function getFavs(): string[] {
  if (!profile.favorites) profile.favorites = [];
  return profile.favorites;
}
export function getRecents(): string[] {
  if (!profile.recents) profile.recents = [];
  return profile.recents;
}

/* --------------------------- time formatting --------------------------- */

export function formatTime(seconds: number): string {
  if (seconds < 60) return seconds + "s";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h + "h " + m + "m";
}

/* ---------------------------- achievements ---------------------------- */

export interface AchState {
  gamesPlayed: number;
  secondsOnPage: number;
  totalWins: number;
  bestSingleScore: number;
  avatar: string;
  name: string;
  theme?: string;
  gamesPlayedByType: Record<string, number>;
  specialAchievements: Record<string, boolean>;
  unlockedCount: number;
  [k: string]: any;
}
export interface Achievement {
  id: string;
  icon: string;
  name: string;
  desc: string;
  test: (s: AchState) => any;
  progress: (s: AchState) => number;
}

const PLAYABLE_TARGET = 33;
const flag = (key: string) => ({
  test: (s: AchState) => s.specialAchievements && s.specialAchievements[key],
  progress: (s: AchState) => (s.specialAchievements && s.specialAchievements[key] ? 1 : 0),
});
const atLeast = (field: "gamesPlayed" | "secondsOnPage" | "totalWins" | "bestSingleScore", n: number) => ({
  test: (s: AchState) => s[field] >= n,
  progress: (s: AchState) => Math.min(1, s[field] / n),
});
const typesPlayed = (s: AchState) => (s.gamesPlayedByType ? Object.keys(s.gamesPlayedByType).length : 0);
const PROTOS = ["protoReaction", "protoTapRush", "protoAimTrainer"];

export const achievements: Achievement[] = [
  { id: "first_game", icon: "🎮", name: "First Steps", desc: "Play your first arcade game", ...atLeast("gamesPlayed", 1) },
  { id: "five_games", icon: "🎯", name: "Getting Warm", desc: "Play 5 arcade games", ...atLeast("gamesPlayed", 5) },
  { id: "twenty_games", icon: "🔥", name: "Arcade Regular", desc: "Play 20 arcade games", ...atLeast("gamesPlayed", 20) },
  { id: "fifty_games", icon: "💎", name: "Arcade Legend", desc: "Play 50 arcade games", ...atLeast("gamesPlayed", 50) },
  {
    id: "all_games", icon: "🎪", name: "Sampling the Menu", desc: `Play all ${PLAYABLE_TARGET} different cabinets`,
    test: (s) => typesPlayed(s) >= PLAYABLE_TARGET, progress: (s) => Math.min(1, typesPlayed(s) / PLAYABLE_TARGET),
  },
  { id: "time_1min", icon: "⏱️", name: "Settled In", desc: "Spend 1 minute in the arcade", ...atLeast("secondsOnPage", 60) },
  { id: "time_10min", icon: "📚", name: "Bookworm", desc: "Spend 10 minutes in the arcade", ...atLeast("secondsOnPage", 600) },
  { id: "time_1hr", icon: "🧘", name: "Dedicated", desc: "Spend 1 hour in the arcade", ...atLeast("secondsOnPage", 3600) },
  { id: "time_5hr", icon: "🪑", name: "Marathon Runner", desc: "Spend 5 hours in the arcade", ...atLeast("secondsOnPage", 18000) },
  { id: "first_win", icon: "🏆", name: "First Victory", desc: "Win your first game", ...atLeast("totalWins", 1) },
  { id: "ten_wins", icon: "🥇", name: "Champion", desc: "Win 10 games total", ...atLeast("totalWins", 10) },
  { id: "twentyfive_wins", icon: "👑", name: "Arcade King", desc: "Win 25 games total", ...atLeast("totalWins", 25) },
  { id: "score_100", icon: "💯", name: "Centurion", desc: "Score 100+ points in a single game", ...atLeast("bestSingleScore", 100) },
  { id: "score_500", icon: "🌟", name: "High Roller", desc: "Score 500+ points in a single game", ...atLeast("bestSingleScore", 500) },
  { id: "score_1000", icon: "⚡", name: "Score Master", desc: "Score 1000+ points in a single game", ...atLeast("bestSingleScore", 1000) },
  { id: "breaker_clear", icon: "🧱", name: "Wall Breaker", desc: "Clear all bricks in Neon Breaker", ...flag("breakerClear") },
  { id: "snake_20", icon: "🐍", name: "Long Snake", desc: "Reach length 20 in Circuit Snake", ...flag("snake20") },
  { id: "pong_shutout", icon: "🏓", name: "Flawless Victory", desc: "Win Neon Pong 7-0", ...flag("pongShutout") },
  { id: "profile_pic", icon: "📷", name: "Picture Perfect", desc: "Upload a profile picture", test: (s) => !!s.avatar, progress: (s) => (s.avatar ? 1 : 0) },
  {
    id: "named", icon: "✏️", name: "Identity", desc: "Set a custom display name",
    test: (s) => s.name && s.name !== "Guest", progress: (s) => (s.name && s.name !== "Guest" ? 1 : 0),
  },
  {
    id: "themed", icon: "🎨", name: "Stylist", desc: "Change your color theme",
    test: (s) => s.theme && s.theme !== "default", progress: (s) => (s.theme && s.theme !== "default" ? 1 : 0),
  },
  { id: "zombie_survivor", icon: "🧟", name: "Zombie Survivor", desc: "Survive 60 seconds in Bot Defense", ...flag("zombieSurvivor") },
  { id: "zombie_slayer", icon: "💀", name: "Zombie Slayer", desc: "Kill 50 zombies in one game", ...flag("zombieSlayer") },
  { id: "zombie_master", icon: "⚔️", name: "Zombie Master", desc: "Survive 120 seconds in Bot Defense", ...flag("zombieMaster") },
  { id: "time_2hr", icon: "🌙", name: "Night Owl", desc: "Spend 2 hours in the arcade", ...atLeast("secondsOnPage", 7200) },
  { id: "time_10hr", icon: "🏰", name: "Castle Dweller", desc: "Spend 10 hours in the arcade", ...atLeast("secondsOnPage", 36000) },
  { id: "score_2000", icon: "💫", name: "Score God", desc: "Score 2000+ points in a single game", ...atLeast("bestSingleScore", 2000) },
  { id: "fifty_wins", icon: "💎", name: "Unstoppable", desc: "Win 50 games total", ...atLeast("totalWins", 50) },
  {
    id: "all_games_9", icon: "🎰", name: "Full House", desc: `Play all ${PLAYABLE_TARGET} different cabinets`,
    test: (s) => typesPlayed(s) >= PLAYABLE_TARGET, progress: (s) => Math.min(1, typesPlayed(s) / PLAYABLE_TARGET),
  },
  {
    id: "half_achievements", icon: "🏅", name: "Completionist", desc: "Unlock half of all achievements",
    test: (s) => s.unlockedCount >= Math.ceil(achievements.length / 2),
    progress: (s) => Math.min(1, s.unlockedCount / Math.ceil(achievements.length / 2)),
  },
  {
    id: "all_achievements", icon: "💎", name: "Perfectionist", desc: "Unlock all achievements",
    test: (s) => s.unlockedCount >= achievements.length - 1,
    progress: (s) => Math.min(1, s.unlockedCount / (achievements.length - 1)),
  },
  {
    id: "proto_trio", icon: "🧪", name: "Prototype Tester", desc: "Play all 3 prototype games",
    test: (s) => PROTOS.every((k) => s.gamesPlayedByType && s.gamesPlayedByType[k]),
    progress: (s) => PROTOS.filter((k) => s.gamesPlayedByType && s.gamesPlayedByType[k]).length / 3,
  },
  // NOTE (parity): the original never put favorites/coins/usedSearch on the achievement
  // state object, so these three could never unlock there either. Kept identical.
  { id: "first_favorite", icon: "⭐", name: "Curator", desc: "Favorite your first cabinet", test: (s) => !!(s.favorites && s.favorites.length), progress: (s) => (s.favorites && s.favorites.length ? 1 : 0) },
  { id: "coin_50", icon: "🪙", name: "Coin Collector", desc: "Earn 50 coins total", test: (s) => (s.coins || 0) >= 50, progress: (s) => Math.min(1, (s.coins || 0) / 50) },
  { id: "searcher", icon: "🔍", name: "Seeker", desc: "Use the arcade search bar", test: (s) => !!s.usedSearch, progress: (s) => (s.usedSearch ? 1 : 0) },
];

export function getAchievementState(): AchState {
  ensureProfileShape();
  const s: AchState = {
    gamesPlayed: profile.gamesPlayed || 0,
    secondsOnPage: profile.secondsOnPage || 0,
    totalWins: 0,
    bestSingleScore: 0,
    avatar: profile.avatar,
    name: profile.name,
    theme: profile.theme,
    gamesPlayedByType: profile.gamesPlayedByType || {},
    specialAchievements: profile.specialAchievements || {},
    unlockedCount: 0,
  };
  for (const k of Object.keys(profile.arcade)) s.totalWins += profile.arcade[k]!.wins || 0;
  s.bestSingleScore = bestSingleScore();
  for (const a of achievements) if (profile.achievements[a.id]) s.unlockedCount++;
  return s;
}

/** Latest unlocked achievement for the toast; component auto-hides after 3.5s. */
export const toastEvents = new Emitter();
export let toastAchievement: Achievement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function showAchievementToast(a: Achievement) {
  toastAchievement = a;
  toastEvents.emit();
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastAchievement = null;
    toastEvents.emit();
  }, 3500);
}

export function checkAchievements() {
  ensureProfileShape();
  const s = getAchievementState();
  for (const a of achievements) {
    if (!profile.achievements[a.id] && a.test(s)) {
      profile.achievements[a.id] = Date.now();
      saveProfile();
      showAchievementToast(a);
    }
  }
  profileEvents.emit();
}

/* ----------------------------- time tracker ----------------------------- */

let timeTrackerStarted = false;
export function startTimeTracker() {
  if (timeTrackerStarted) return;
  timeTrackerStarted = true;
  ensureProfileShape();
  setInterval(() => {
    profile.secondsOnPage = (profile.secondsOnPage || 0) + 1;
    profile.totalPoints = totalHighScorePoints();
    if (profile.secondsOnPage % 5 === 0) {
      checkAchievements();
      saveProfile();
    }
    tickEvents.emit();
  }, 1000);
}

export function bannerTiers(totalPoints: number) {
  return [
    { threshold: 0, name: "Default Banner", unlocked: true },
    { threshold: 100, name: "Bronze Banner", unlocked: totalPoints >= 100 },
    { threshold: 300, name: "Silver Banner", unlocked: totalPoints >= 300 },
    { threshold: 600, name: "Gold Banner", unlocked: totalPoints >= 600 },
    { threshold: 1000, name: "Platinum Banner", unlocked: totalPoints >= 1000 },
  ];
}

/* ---------------------------- naming tables ---------------------------- */

/** Display names for leaderboard rows (keys not listed fall back to the raw key, as in the original). */
export const LB_NAMES: Record<string, string> = {
  neonBreaker: "Neon Breaker", starfallDefender: "Starfall Defender", circuitSnake: "Circuit Snake",
  neonPong: "Neon Pong", meteorCommand: "Meteor Command", stackSurge: "Stack Surge", botDefense: "Bot Defense",
  rooftopRumble: "Rooftop Rumble", circuitRacer: "Neon Sprint", crystalGarden: "Crystal Garden",
  memoryMatch: "Memory Match", colorMixer: "Color Mixer", fishingHole: "Fishing Hole", dotConnect: "Dot Connect",
  slidingPuzzle: "Slide Puzzle", patternMemory: "Pattern Memory", towerBuilder: "Tower Builder",
  bubbleSort: "Bubble Sort", idleFarm: "Idle Farm", laserDodge: "Laser Dodge", ninjaDash: "Ninja Dash",
  orbCatcher: "Orb Catcher", bladeSlice: "Blade Slice", gravityFlip: "Gravity Flip", bulletStorm: "Bullet Storm",
  platformJumper: "Platform Jumper", pixelRunner: "Pixel Runner", chainReactor: "Chain Reactor", rocketDash: "Rocket Dash",
};

/* ------------------------------ export ------------------------------ */

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportProfile() {
  profile.updatedAt = Date.now();
  const data = JSON.stringify(profile, null, 2);
  const safe = (profile.name || "guest").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "guest";
  downloadBlob("workbench-progress-" + safe + ".json", new Blob([data], { type: "application/json" }));
}

const int0 = (v: any) => Math.max(0, parseInt(v, 10) || 0);
/** Validates + sanitises an imported progress file. Returns the clean profile or an error message. */
export function sanitizeImportedProfile(parsed: any): { ok: true; profile: Profile } | { ok: false; error: string } {
  if (!parsed || typeof parsed !== "object" || !parsed.arcade || !parsed.arcade.rooftopRumble) {
    return { ok: false, error: "That file doesn’t look like a Workbench progress export." };
  }
  const clean = defaultProfile();
  clean.name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim().slice(0, 24) : "Guest";
  clean.createdAt = typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now();
  const rec = (r: any): FightRecord => {
    r = r || emptyRecord();
    return { wins: int0(r.wins), losses: int0(r.losses), draws: int0(r.draws), kos: int0(r.kos), fights: int0(r.fights) };
  };
  for (const k of ["rooftopRumble", "circuitRacer", "neonBreaker", "starfallDefender", "circuitSnake", "neonPong", "meteorCommand", "stackSurge", "botDefense"]) {
    clean.arcade[k] = rec(parsed.arcade[k]);
  }
  const imported = (parsed.arcade && parsed.arcade.highScores) || parsed.highScores;
  const dhs = defaultHighScores();
  if (imported) {
    clean.highScores = {};
    for (const hk of Object.keys(dhs)) {
      clean.highScores[hk] = {};
      for (const hm of Object.keys(dhs[hk]!)) {
        clean.highScores[hk]![hm] = imported[hk] && imported[hk][hm] ? int0(imported[hk][hm]) : 0;
      }
    }
  } else clean.highScores = dhs;
  clean.theme = parsed.theme ? parsed.theme : "default";
  return { ok: true, profile: clean };
}
