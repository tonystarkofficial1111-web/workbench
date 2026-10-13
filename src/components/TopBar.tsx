import { TAB_BUTTONS, activeTab, goto } from "../core/nav";
import { useValue, useEmitter } from "../core/store";
import { WB_SOUND, soundEvents } from "../core/sound";
import { getCoins, profileEvents } from "../core/profile";

export function TopBar() {
  const tab = useValue(activeTab);
  useEmitter(profileEvents);
  useEmitter(soundEvents);
  const muted = WB_SOUND.isMuted();
  return (
    <header id="topbar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 3 27 9.5 27 22.5 16 29 5 22.5 5 9.5Z" fill="none" stroke="#e0a458" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 3 16 16 27 9.5" fill="none" stroke="#e0a458" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 16 16 29" fill="none" stroke="#e0a458" strokeWidth="2" />
          <path d="M16 16 5 9.5" fill="none" stroke="#e0a458" strokeWidth="2" />
        </svg>
        <span>Workbench</span>
      </div>
      <nav className="tabs">
        {TAB_BUTTONS.map((t) => (
          <button
            key={t.id}
            className={"tabbtn" + (tab === t.id ? " active" : "")}
            data-target={t.id}
            type="button"
            onClick={() => {
              WB_SOUND.click();
              goto(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="topbar-right">
        <div className="coin-pill" id="coin-pill" title="Arcade coins earned">
          🪙 <span id="coin-count">{getCoins()}</span>
        </div>
        <button
          className={"icon-btn" + (muted ? " muted" : "")}
          id="sound-toggle"
          type="button"
          title="Toggle sound"
          aria-label="Toggle sound"
          onClick={() => WB_SOUND.toggle()}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </header>
  );
}
