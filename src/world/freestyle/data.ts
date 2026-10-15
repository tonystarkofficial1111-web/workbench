/**
 * Free Style rules in one place: what things cost, what food does, how fast needs drop, what each role and building does.
 * Times are in game seconds (one day = DAY_LENGTH = 300 s at 1x).
 */
export type Res = "wood" | "stone" | "iron" | "rawMeat" | "meat" | "bread" | "rawWater" | "water" | "hide" | "wool" | "feather" | "spear" | "armour";
export type Cost = Partial<Record<Res, number>>;

export const RES_INFO: Record<Res, { name: string; icon: string; food?: { hunger?: number; thirst?: number; heal?: number; sick?: number } }> = {
  wood: { name: "Wood", icon: "🪵" },
  stone: { name: "Stone", icon: "🪨" },
  iron: { name: "Iron", icon: "⛓️" },
  rawMeat: { name: "Raw meat", icon: "🥩", food: { hunger: 18, heal: 0, sick: 0.25 } },
  meat: { name: "Cooked meat", icon: "🍖", food: { hunger: 45, heal: 12 } },
  bread: { name: "Bread", icon: "🍞", food: { hunger: 35, heal: 8 } },
  rawWater: { name: "Lake water", icon: "💧", food: { thirst: 30, sick: 0.3 } },
  water: { name: "Boiled water", icon: "🫖", food: { thirst: 45, heal: 4 } },
  hide: { name: "Hide", icon: "🟫" },
  wool: { name: "Wool", icon: "🧶" },
  feather: { name: "Feathers", icon: "🪶" },
  spear: { name: "Spear", icon: "🗡️" },
  armour: { name: "Armour", icon: "🛡️" },
};
export const FOOD_ITEMS: Res[] = ["bread", "meat", "water", "rawMeat", "rawWater"];

/** needs drop per game second; work and the night change the rate */
export const NEEDS = {
  hunger: 100 / (1.6 * 300),          // a full stomach lasts about 1.6 days
  thirst: 100 / (1.1 * 300),          // a full drink lasts about 1.1 days
  workMul: 1.35, buildMul: 1.6, sleepMul: 0.45,
  starve: 100 / (0.5 * 300),          // health lost per second while starving or parched (half a day from full to collapse)
  regen: 100 / (2 * 300),             // health regained per second while fed and watered (above 50 / 50)
  collapseFor: 300,                   // a collapsed villager lies in front of the tent for one full day
  sickFor: 120, sickDrain: 100 / (1.5 * 300),
};

export type Role = "idle" | "wood" | "miner" | "farmer" | "hunter" | "water" | "cook" | "builder" | "smith" | "guard";
export const ROLES: Record<Role, { name: string; icon: string; desc: string }> = {
  idle: { name: "Idle", icon: "💤", desc: "Rests near the tent." },
  wood: { name: "Woodcutter", icon: "🪓", desc: "Chops trees and brings the wood back." },
  miner: { name: "Miner", icon: "⛏️", desc: "Mines stone and iron from rocky hills, or works in a Mine." },
  farmer: { name: "Farmer", icon: "🌾", desc: "Works a Farm, which bakes bread." },
  hunter: { name: "Hunter", icon: "🏹", desc: "Hunts chickens, sheep and cows for meat, hides and wool. Without a spear and armour they get hurt." },
  water: { name: "Water carrier", icon: "🪣", desc: "Fetches water from a lake, river or a Well." },
  cook: { name: "Cook", icon: "🍳", desc: "At the campfire: cooks raw meat and boils water so it is safe." },
  builder: { name: "Builder", icon: "🔨", desc: "Builds what you place. Hard work: they get hungry faster." },
  smith: { name: "Smith", icon: "⚒️", desc: "Makes spears at the Workshop and armour at the Armory." },
  guard: { name: "Guard", icon: "🛡️", desc: "Protects the village. Assign one to a Tower to man it." },
};

export type BType = "tent" | "campfire" | "house" | "farm" | "well" | "mine" | "workshop" | "armory" | "market" | "tower" | "ballista" | "catapult";
/** buildings a Guard crews (towers are climbed, the siege engines are worked from behind) */
export const CREWED: BType[] = ["tower", "ballista", "catapult"];
export interface BDef { name: string; icon: string; cost: Cost; work: number; r: number; desc: string; slots?: number; beds?: number; buildable?: boolean }
export const BUILD: Record<BType, BDef> = {
  tent: { name: "Tent", icon: "⛺", cost: {}, work: 0, r: 2.4, beds: 6, desc: "Your home. Click it to feed villagers, give jobs, build and raid. Food and resources are kept here." },
  campfire: { name: "Campfire", icon: "🔥", cost: { wood: 8, stone: 6 }, work: 12, r: 1.0, slots: 2, desc: "Where cooks cook meat and boil water." },
  house: { name: "House", icon: "🏠", cost: { wood: 25, stone: 10 }, work: 40, r: 1.6, beds: 3, desc: "Beds for 3 more villagers. New villagers only join if there is a free bed." },
  farm: { name: "Farm", icon: "🌾", cost: { wood: 30, stone: 6 }, work: 50, r: 2.3, slots: 2, desc: "Two farmers grow wheat here and bake bread." },
  well: { name: "Well", icon: "🪣", cost: { wood: 12, stone: 22 }, work: 35, r: 1.0, desc: "Water close to home: carriers fill up much faster here." },
  mine: { name: "Mine", icon: "⛏️", cost: { wood: 30, stone: 20 }, work: 60, r: 1.7, slots: 3, desc: "Up to three miners dig stone and iron here, without walking to the hills." },
  workshop: { name: "Workshop", icon: "🪚", cost: { wood: 40, stone: 18, iron: 4 }, work: 60, r: 1.8, slots: 1, desc: "A smith makes spears here (3 wood + 2 iron each). Spears keep hunters and guards safer." },
  armory: { name: "Armory", icon: "🛡️", cost: { wood: 30, stone: 25, iron: 10 }, work: 70, r: 1.7, slots: 1, desc: "A smith makes armour here (5 iron + 2 hide each)." },
  market: { name: "Market", icon: "⚖️", cost: { wood: 35, stone: 15 }, work: 50, r: 1.7, desc: "Trade what you have too much of." },
  tower: { name: "Tower", icon: "🗼", cost: { wood: 40, iron: 12 }, work: 60, r: 1.4, desc: "A watchtower. Empty until you assign a Guard to it; a manned tower shoots at raiders." },
  ballista: { name: "Giant crossbow", icon: "🏹", cost: { wood: 45, iron: 14 }, work: 60, r: 1.3, desc: "A giant crossbow on a carriage. Send a Guard to crew it: it fires huge bolts that go through up to three raiders." },
  catapult: { name: "Catapult", icon: "☄️", cost: { wood: 50, stone: 20, iron: 8 }, work: 70, r: 1.2, desc: "Hurls boulders that hit every raider where they land. Needs a Guard to crew it; slow to reload, best against groups." },
};
export const BUILD_ORDER: BType[] = ["campfire", "house", "farm", "well", "mine", "workshop", "armory", "market", "tower", "ballista", "catapult"];

export const PRODUCE = {
  breadEvery: 32,            // per farmer
  mineStone: { every: 14, n: 2 }, mineIron: { every: 26, n: 1 },   // per miner in a Mine
  nodeStone: { every: 6, n: 3 }, nodeIron: { every: 8, n: 2 },     // per trip from a hill
  chop: 4.5, woodPerTree: 5,
  fill: 6, waterPerTrip: 3, wellFill: 3, wellPerTrip: 5,
  cook: 6, boilEvery: 5, boilN: 1,
  spear: { every: 22, cost: { wood: 3, iron: 2 } as Cost },
  armour: { every: 32, cost: { iron: 5, hide: 2 } as Cost },
  build: 1,                 // work points per builder per second
};

export const TRADES: Array<{ give: Cost; get: Cost }> = [
  { give: { wood: 12 }, get: { iron: 2 } },
  { give: { stone: 12 }, get: { iron: 2 } },
  { give: { hide: 3 }, get: { bread: 4 } },
  { give: { wool: 3 }, get: { bread: 4 } },
  { give: { feather: 6 }, get: { water: 4 } },
  { give: { iron: 2 }, get: { wood: 10 } },
];

export const ANIMALS = {
  chicken: { hp: 12, speed: 2.2, meat: 1, extra: { feather: 2 } as Cost, hit: 2, kick: 0, r: 0.35 },
  sheep: { hp: 35, speed: 2.4, meat: 3, extra: { wool: 2 } as Cost, hit: 6, kick: 0, r: 0.6 },
  cow: { hp: 70, speed: 2.0, meat: 5, extra: { hide: 2 } as Cost, hit: 14, kick: 1, r: 0.8 },
};
export type AnimalKind = keyof typeof ANIMALS;

export const START_STOCK: Partial<Record<Res, number>> = { wood: 30, stone: 12, iron: 0, bread: 10, meat: 6, water: 12, rawWater: 0, rawMeat: 0 };
export const START_VILLAGERS = 4;

export function canPay(stock: Partial<Record<Res, number>>, c: Cost) { return (Object.keys(c) as Res[]).every((k) => (stock[k] || 0) >= (c[k] || 0)); }
export function pay(stock: Partial<Record<Res, number>>, c: Cost) { (Object.keys(c) as Res[]).forEach((k) => { stock[k] = (stock[k] || 0) - (c[k] || 0); }); }
export function costText(c: Cost) { return (Object.keys(c) as Res[]).map((k) => (c[k] || 0) + " " + RES_INFO[k].icon).join("  "); }
