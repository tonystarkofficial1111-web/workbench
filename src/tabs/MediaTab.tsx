import { useRef, useState } from "react";
import { activeTab } from "../core/nav";
import { useValue } from "../core/store";
import { VideoSection } from "../media/Video";

type Which = "video" | "music" | "studio" | "utilities" | null;
const num = (v: string) => parseFloat(v) || 0;

function Studio({ onBack }: { onBack: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const [w, setW] = useState("800"), [h, setH] = useState("600");
  return (
    <div id="media-studio-content">
      <button className="ghost media-back-any" data-back-media="1" style={{ marginBottom: 12 }} onClick={onBack}>← Back to Media</button>
      <div className="media-tool-card">
        <h3>🎨 Studio</h3>
        <p>Browser-based image workspace. Import an image, crop it, resize it, rotate it, and export the result.</p>
        <input id="studio-file" type="file" accept="image/*" onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (!f) return;
          const im = new Image();
          im.onload = () => {
            img.current = im;
            const c = cv.current!;
            c.width = im.naturalWidth;
            c.height = im.naturalHeight;
            c.getContext("2d")!.drawImage(im, 0, 0);
          };
          im.src = URL.createObjectURL(f);
        }} />
        <div className="studio-controls">
          <label>Width <input id="studio-w" type="number" min={1} value={w} onChange={(e) => setW(e.target.value)} /></label>
          <label>Height <input id="studio-h" type="number" min={1} value={h} onChange={(e) => setH(e.target.value)} /></label>
          <button id="studio-fit" onClick={() => {
            if (!img.current) return;
            const c = cv.current!;
            c.width = num(w); c.height = num(h);
            c.getContext("2d")!.drawImage(img.current, 0, 0, c.width, c.height);
          }}>Fit</button>
          <button id="studio-export" onClick={() => {
            const a = document.createElement("a");
            a.download = "workbench-studio.png";
            a.href = cv.current!.toDataURL("image/png");
            a.click();
          }}>Export PNG</button>
        </div>
        <canvas id="studio-canvas" ref={cv}></canvas>
      </div>
    </div>
  );
}

function Utilities({ onBack }: { onBack: () => void }) {
  const [miles, setMiles] = useState("");
  const [qr, setQr] = useState("");
  return (
    <div id="media-utilities-content">
      <button className="ghost media-back-any" data-back-media="1" style={{ marginBottom: 12 }} onClick={onBack}>← Back to Media</button>
      <div className="utility-grid">
        <div className="media-tool-card">
          <h3>🔳 QR Generator</h3>
          <input id="util-qr" placeholder="Text or URL" value={qr} onChange={(e) => setQr(e.target.value)} />
          <div id="util-qr-out">QR preview</div>
        </div>
        <div className="media-tool-card">
          <h3>📐 Unit Converter</h3>
          <input id="util-miles" type="number" placeholder="Miles" value={miles} onChange={(e) => setMiles(e.target.value)} />
          <strong id="util-km-out">{miles === "" ? "— km" : (num(miles) * 1.609344).toFixed(3) + " km"}</strong>
        </div>
      </div>
    </div>
  );
}

export function MediaTab() {
  const tab = useValue(activeTab);
  const [which, setWhich] = useState<Which>(null);
  // The original left the picker as display:flex after leaving Video/Music, and display:grid after Studio/Utilities.
  const [selDisplay, setSelDisplay] = useState<string | undefined>(undefined);
  const back = (d: string) => () => { setWhich(null); setSelDisplay(d); };

  return (
    <section id="tab-videos" className={"tab" + (tab === "tab-videos" ? " active" : "")}>
      <div className="vid-wrap">
        <h2>Media</h2>
        <div className="media-select" id="media-select-screen" style={{ display: which ? "none" : selDisplay }}>
          {([["video", "🎬", "Video", "Movies & sharing"], ["music", "🎵", "Music", "MP3 player"], ["studio", "🎨", "Studio", "Image tools"], ["utilities", "🧰", "Utility Bay", "Everyday tools"]] as const).map(([k, icon, name, sub]) => (
            <button key={k} className="media-choice" data-media={k} onClick={() => setWhich(k)}>
              <span className="media-icon">{icon}</span>
              <span>{name}</span>
              <span className="media-sub">{sub}</span>
            </button>
          ))}
        </div>
        {/* Video stays mounted so a playing stream/list state survives; it hides itself when not selected. */}
        <div style={{ display: which === "video" ? "block" : "none" }}><VideoSection onBack={back("flex")} /></div>
        {which === "studio" && <Studio onBack={back("grid")} />}
        {which === "utilities" && <Utilities onBack={back("grid")} />}
        {which === "music" && (
          <div id="media-music-content">
            <button className="ghost" id="media-back-btn-2" style={{ marginBottom: 12 }} onClick={back("flex")}>← Back to Media</button>
            <div className="music-wip">
              <h3>🎵 MP3 Player</h3>
              <p>The music player is coming soon. You'll be able to import and play MP3 files offline, just like the video library.</p>
              <span className="wip-badge">WORK IN PROGRESS</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
