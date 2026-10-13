import { useEmitter } from "../core/store";
import { toastAchievement, toastEvents } from "../core/profile";
import { badgeToastEvents, toastText } from "../features/badges";

/** Achievement toast + badge toast (both live outside the tab sections, as in the original body). */
export function Toasts() {
  useEmitter(toastEvents);
  useEmitter(badgeToastEvents);
  const a = toastAchievement;
  return (
    <>
      <div className={"ac-achievement-toast" + (a ? " show" : "")} id="achievement-toast">
        <span className="at-icon" id="at-icon">{a ? a.icon : "🏆"}</span>
        <div className="at-text">
          <strong id="at-name">{a ? a.name : "Achievement Unlocked!"}</strong>
          <span id="at-desc">{a ? a.desc : ""}</span>
        </div>
      </div>
      <div id="wb-badge-toast" style={{ display: toastText.value ? "block" : "none" }}>
        {toastText.value}
      </div>
    </>
  );
}
