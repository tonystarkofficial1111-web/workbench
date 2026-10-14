import { useState } from "react";

/** The Infinite world's Instructions: five short pages instead of one wall of text. */
const PAGES: { id: string; label: string; icon: string; lead: string; items: [string, string][] }[] = [
  {
    id: "basics", label: "Basics", icon: "ðŸ§­",
    lead: "Keep your castle standing. From Day 10, zombies climb out of the sea every night, more every day, and every 10th wave brings a boss. Dawn drives them off.",
    items: [
      ["Look around", "WASD or the arrow keys move the camera, Q / E turn it, the mouse wheel zooms, Z / X tilts the view (flatten it to watch the sun set over the sea)."],
      ["Move your king", "Click the ground to walk there. Click a tree to chop it (+3 wood). Click a zombie to attack it."],
      ["Your helpers", "The named soldiers cut wood and fight on their own. Each house lets one more helper join."],
      ["Time", "A day lasts about 100 seconds: morning, golden evening, night. The 2x and 10x buttons speed it up."],
    ],
  },
  {
    id: "build", label: "Build", icon: "ðŸ ",
    lead: "Choose a building, then move the mouse: green is free ground, red is blocked. Click to place, R turns it, Esc or right-click cancels.",
    items: [
      ["House 25w Â· Farm 30w", "A house adds a helper. A farm pays +10 wood every growth cycle."],
      ["Mine 10w", "A cave mine. It slowly makes iron and sometimes fits a helper with armour or a better sword (a gold halo shows who)."],
      ["Market 35w Â· Workshop 40w Â· Armory 50w", "Click a placed building: the market trades wood for iron, the workshop builds crossbows and catapults, the armory equips soldiers."],
      ["Good to know", "Building clears the plants and trees under it. Cave mounds and big scenery trees are in the way; build around them. Flags, smoke and the farm's windmill follow the wind, and windows and lanterns light up at dusk."],
    ],
  },
  {
    id: "defend", label: "Defend", icon: "ðŸ›¡ï¸",
    lead: "Zombies walk straight for your castle. Slow them, shoot them, and make them chew through walls.",
    items: [
      ["Wall 15w Â· Tower 60w", "Walls snap to towers and to each other so you can close a line (R and [ ] turn them, Snap toggles it). Helpers man towers at night, which makes them faster and stronger."],
      ["Trap 20w Â· Torch 10w", "A trap hurts and slows (6 uses, helpers reload it). Torches light the night and slow zombies nearby."],
      ["Your castle", "Watch its health bar. Zombies cannot walk through the walls, so they gather outside and chew. A badly hurt castle starts to smoke, then burn."],
      ["Demolish", "Gives half the wood back. Damaged defenses are repaired by helpers."],
    ],
  },
  {
    id: "army", label: "Army", icon: "âš”ï¸",
    lead: "Iron buys gear. Every soldier has a name, and a golden halo with a light beam shows who you are working on.",
    items: [
      ["Armory", "Click it, pick a soldier by name, then buy Armour (5 iron, +40 health), a Shield (3) or a Spear (2). The Find button moves the camera to them."],
      ["Workshop", "Crossbow (8 iron) for a soldier, or a Catapult (15 iron) that smashes zombies from afar."],
      ["Follow the King", "Soldiers line up around you: shields in front, then spears, then crossbows."],
    ],
  },
  {
    id: "world", label: "World", icon: "ðŸŒ´",
    lead: "The island is a jungle ringed by beach. Weather changes every day.",
    items: [
      ["Weather", "Rain and fog change how zombies behave (rain slows them, fog hides far ones and shortens tower range). A blood moon doubles a wave. Wind, clouds and thunder are only for looks: they sway flags and trees and roughen the sea."],
      ["Jungle", "Smaller trees give wood. Giant trees are scenery. Rock caves with stone paths mark the jungle; palms on the beach can be chopped too."],
      ["Graphics", "Use the Graphics button to pick High, Medium or Low. Low draws fewer pixels and fewer details: best for Chromebooks and older computers."],
    ],
  },
];

export function InfiniteGuide({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const page = PAGES[tab]!;
  return (
    <div className="c guide">
      <h3>ðŸŒ Infinite world: how to play</h3>
      <div className="wbg-tabs" role="tablist">
        {PAGES.map((p, i) => (
          <button key={p.id} type="button" role="tab" aria-selected={i === tab} className={"wbg-tab" + (i === tab ? " on" : "")} onClick={() => setTab(i)}>
            <span aria-hidden="true">{p.icon}</span> {p.label}
          </button>
        ))}
      </div>
      <p className="wbg-lead">{page.lead}</p>
      <ul className="wbg-list">
        {page.items.map(([h, t]) => (
          <li key={h}><b>{h}</b><span>{t}</span></li>
        ))}
      </ul>
      <div className="wbg-foot">
        <button type="button" className="x" disabled={tab === 0} onClick={() => setTab(tab - 1)}>Back</button>
        {tab < PAGES.length - 1 ? <button type="button" className="x" onClick={() => setTab(tab + 1)}>Next</button> : null}
        <button type="button" className="x" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
