import { useEffect } from "react";
import { TopBar } from "./components/TopBar";
import { Toasts } from "./components/Toasts";
import { VersionBadge } from "./components/VersionBadge";
import { Tour } from "./components/Tour";
import { BackupBar } from "./components/BackupBar";
import { SaveChooser } from "./components/SaveChooser";
import { PerfHud } from "./components/PerfHud";
import { OverlayHost } from "./core/overlay";
import { QuickSearch } from "./components/QuickSearch";
import { LiveBackground } from "./components/LiveBackground";
import { StartTab } from "./tabs/StartTab";
import { DataTab } from "./tabs/DataTab";
import { DevTab } from "./tabs/DevTab";
import { EduTab } from "./tabs/EduTab";
import { MediaTab } from "./tabs/MediaTab";
import { AssistantTab } from "./tabs/AssistantTab";
import { ArcadeTab } from "./tabs/ArcadeTab";
import { WorldTab } from "./tabs/WorldTab";
import { activeTab, arcadeSub, layoutMode, stepTab, loadAccent, initTheme, updateActiveTabColor } from "./core/nav";
import { useValue } from "./core/store";
import { startTimeTracker, ensureProfileShape, checkAchievements } from "./core/profile";
import { startBadges } from "./features/badges";
import { applyShop } from "./features/shop";
import { perfActions } from "./core/perf";
import { APP_VERSION } from "./version";

/** Body classes the original toggled imperatively (environment controller + layout toggle). */
function useBodyEnvironment() {
  const tab = useValue(activeTab);
  const sub = useValue(arcadeSub);
  const layout = useValue(layoutMode);

  useEffect(() => {
    const b = document.body;
    b.classList.remove("wb-tab-start", "wb-tab-arcade", "wb-tab-ai", "wb-tab-data", "wb-tab-dev", "wb-arcade-games", "wb-arcade-cars");
    if (tab === "tab-start") b.classList.add("wb-tab-start");
    if (tab === "tab-arcade") {
      b.classList.add("wb-tab-arcade", "wb-arcade-" + (sub === "cars" ? "cars" : "games"));
    }
    if (tab === "tab-ai") b.classList.add("wb-tab-ai");
    if (tab === "tab-data") b.classList.add("wb-tab-data");
    if (tab === "tab-dev") b.classList.add("wb-tab-dev");
  }, [tab, sub]);

  useEffect(() => {
    document.body.classList.toggle("layout-vertical", layout === "vertical");
    document.body.dataset.layout = layout;
  }, [layout]);
}

export function App() {
  useBodyEnvironment();

  useEffect(() => {
    // One-time boot (mirrors the init order of the original page).
    document.documentElement.style.setProperty("--wb-version", JSON.stringify(APP_VERSION));
    ensureProfileShape();
    initTheme();
    loadAccent();
    applyShop();
    startTimeTracker();
    checkAchievements();
    startBadges();
    perfActions.init();
    try {
      const key = "wb_start_seen_" + APP_VERSION;
      if (!localStorage.getItem(key)) {
        document.body.classList.add("start-new-user");
        window.setTimeout(() => {
          try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
        }, 12000);
      }
    } catch {
      document.body.classList.add("start-new-user");
    }
    window.addEventListener("load", updateActiveTabColor);
    setTimeout(updateActiveTabColor, 400);

    // Arrow keys move between top tabs, but only while the Arcade tab is open and no game overlay is up.
    const onKey = (e: KeyboardEvent) => {
      const arcadeOn = activeTab.get() === "tab-arcade";
      const overlayOn = !!document.getElementById("ac-overlay")?.classList.contains("on");
      const typing = /input|textarea|select/i.test(document.activeElement ? document.activeElement.tagName : "");
      if (!arcadeOn || overlayOn || typing) return;
      if (e.key === "ArrowRight") stepTab(1);
      else if (e.key === "ArrowLeft") stepTab(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <LiveBackground />
      <div id="app">
        <TopBar />
        <main>
          <StartTab />
          <WorldTab />
          <EduTab />
          <MediaTab />
          <AssistantTab />
          <ArcadeTab />
          <DataTab />
          <DevTab />
        </main>
      </div>
      <Toasts />
      <VersionBadge />
      <Tour />
      <BackupBar />
      <SaveChooser />
      <PerfHud />
      <OverlayHost />
      <QuickSearch />
    </>
  );
}
