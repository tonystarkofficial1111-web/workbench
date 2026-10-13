import { useEffect, useRef } from "react";
import { Value, useValue } from "../core/store";
import {
  achievements, bestSingleScore, downloadBlob, formatTime, getAchievementState, getProfile, LB_NAMES, totalHighScorePoints,
} from "../core/profile";
import { worldBridge } from "../core/bridge";

/** Shareable stats card (original share-card canvas, 480x640). */
const open = new Value(false);
let canvasEl: HTMLCanvasElement | null = null;

function drawText(ctx: CanvasRenderingContext2D, W: number, H: number, picY: number) {
  const p = getProfile();
  ctx.fillStyle = "#e8e6df";
  ctx.font = "bold 24px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(p.name || "Guest", W / 2, picY + 85);
  if (p.bio) {
    ctx.fillStyle = "#8b93a1";
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText(p.bio, W / 2, picY + 105);
  }
  ctx.strokeStyle = "#2e3846";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, picY + 125);
  ctx.lineTo(W - 40, picY + 125);
  ctx.stroke();
  const s = getAchievementState();
  const statsY = picY + 155;
  const stats: [string, string | number][] = [
    ["Games Played", s.gamesPlayed],
    ["Total Wins", s.totalWins],
    ["Best Score", s.bestSingleScore],
    ["Time Spent", formatTime(s.secondsOnPage)],
  ];
  ctx.textAlign = "left";
  for (let i = 0; i < stats.length; i++) {
    const y = statsY + i * 32;
    ctx.fillStyle = "#8b93a1";
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText(stats[i]![0], 50, y);
    ctx.fillStyle = "#5fd4c7";
    ctx.font = "bold 16px Space Grotesk, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(stats[i]![1]), W - 50, y);
    ctx.textAlign = "left";
  }
  const achY = statsY + stats.length * 32 + 20;
  ctx.strokeStyle = "#2e3846";
  ctx.beginPath();
  ctx.moveTo(40, achY - 10);
  ctx.lineTo(W - 40, achY - 10);
  ctx.stroke();
  ctx.fillStyle = "#e0a458";
  ctx.font = "bold 14px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Achievements: " + s.unlockedCount + " / " + achievements.length, W / 2, achY + 10);
  const lbY = achY + 35;
  ctx.fillStyle = "#8b93a1";
  ctx.font = "12px Inter, sans-serif";
  ctx.textAlign = "left";
  const entries: { game: string; mode: string; score: number }[] = [];
  if (p.highScores) {
    for (const gk of Object.keys(p.highScores))
      for (const mk of Object.keys(p.highScores[gk]!)) {
        const raw = p.highScores[gk]![mk]!;
        if (raw > 0) entries.push({ game: LB_NAMES[gk] || gk, mode: mk, score: raw });
      }
  }
  entries.sort((a, b) => b.score - a.score);
  const topN = Math.min(3, entries.length);
  ctx.fillStyle = "#e0a458";
  ctx.font = "bold 13px Space Grotesk, sans-serif";
  ctx.fillText("Top Scores", 50, lbY);
  for (let j = 0; j < topN; j++) {
    const e = entries[j]!;
    const ly = lbY + 22 + j * 20;
    ctx.fillStyle = "#e8e6df";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(j + 1 + ". " + e.game + " (" + e.mode + ")", 50, ly);
    ctx.fillStyle = "#5fd4c7";
    ctx.textAlign = "right";
    ctx.fillText(String(e.score), W - 50, ly);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#8b93a1";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Generated " + new Date().toLocaleDateString(), W / 2, H - 25);
}

function paint() {
  const canvas = canvasEl;
  if (!canvas) return;
  const p = getProfile();
  const ctx = canvas.getContext("2d")!;
  const W = 480, H = 640;
  canvas.width = W;
  canvas.height = H;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#12161d");
  grad.addColorStop(0.5, "#1b212b");
  grad.addColorStop(1, "#12161d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.7, 80, 20, W * 0.7, 80, 200);
  glow.addColorStop(0, "rgba(224,164,88,0.2)");
  glow.addColorStop(1, "rgba(224,164,88,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 200);
  ctx.strokeStyle = "#e0a458";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  const totalPts = totalHighScorePoints();
  let bannerName = "Default", bannerColor = "#5fd4c7";
  if (totalPts >= 1000) { bannerName = "PLATINUM"; bannerColor = "#e5e4e2"; }
  else if (totalPts >= 600) { bannerName = "GOLD"; bannerColor = "#ffd700"; }
  else if (totalPts >= 300) { bannerName = "SILVER"; bannerColor = "#c0c0c0"; }
  else if (totalPts >= 100) { bannerName = "BRONZE"; bannerColor = "#cd7f32"; }
  ctx.fillStyle = bannerColor;
  ctx.beginPath();
  ctx.moveTo(30, 85); ctx.lineTo(W - 30, 85); ctx.lineTo(W - 40, 100); ctx.lineTo(W / 2 + 20, 100);
  ctx.lineTo(W / 2, 115); ctx.lineTo(W / 2 - 20, 100); ctx.lineTo(40, 100); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#12161d";
  ctx.font = "bold 11px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(bannerName + " BANNER", W / 2, 98);
  ctx.fillStyle = "#e8e6df";
  ctx.font = "bold 28px Space Grotesk, sans-serif";
  ctx.fillText("ARCADE PROFILE", W / 2, 50);
  ctx.fillStyle = "#8b93a1";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText("Stark Enterprises Workbench", W / 2, 72);
  const picX = W / 2, picY = 145, picR = 55;
  if (p.avatar) {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(picX, picY, picR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, picX - picR, picY - picR, picR * 2, picR * 2);
      ctx.restore();
      ctx.strokeStyle = "#e0a458";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(picX, picY, picR, 0, Math.PI * 2);
      ctx.stroke();
      drawText(ctx, W, H, picY);
    };
    img.src = p.avatar;
  } else {
    ctx.fillStyle = "#232a35";
    ctx.beginPath();
    ctx.arc(picX, picY, picR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e0a458";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#8b93a1";
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👤", picX, picY);
    ctx.textBaseline = "alphabetic";
    drawText(ctx, W, H, picY);
  }
}

export function generateShareCard() {
  open.set(true);
  // Canvas mounts with the modal; paint on next frame.
  requestAnimationFrame(paint);
}

function summaryText() {
  const p = getProfile();
  const s = getAchievementState();
  const pts = totalHighScorePoints();
  let bn = "Default";
  if (pts >= 1000) bn = "Platinum";
  else if (pts >= 600) bn = "Gold";
  else if (pts >= 300) bn = "Silver";
  else if (pts >= 100) bn = "Bronze";
  return (
    "🎮 Arcade Profile: " + (p.name || "Guest") + "\n" +
    "Games Played: " + s.gamesPlayed + "\n" +
    "Total Wins: " + s.totalWins + "\n" +
    "Best Score: " + bestSingleScore() + "\n" +
    "Time Spent: " + formatTime(s.secondsOnPage) + "\n" +
    "Achievements: " + s.unlockedCount + " / " + achievements.length + "\n" +
    "Banner: " + bn + "\n" +
    "Game Day: " + (worldBridge.day.get() || 1) + "\n" +
    "— Generated by Workbench Arcade"
  );
}

export function ShareCardModal() {
  const on = useValue(open);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { canvasEl = ref.current; });
  return (
    <div id="share-card-modal" className={on ? "on" : ""}>
      <button className="share-card-close" id="share-card-close" onClick={() => open.set(false)}>&times;</button>
      <canvas id="share-card-canvas" ref={ref} width={480} height={640}></canvas>
      <div className="share-card-actions">
        <button
          type="button"
          id="share-card-download"
          onClick={() => {
            ref.current?.toBlob((blob) => {
              if (!blob) return;
              const safe = (getProfile().name || "guest").toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "guest";
              downloadBlob("arcade-card-" + safe + ".png", blob);
            }, "image/png");
          }}
        >
          Download PNG
        </button>
        <button
          type="button"
          id="share-card-copy"
          onClick={() => {
            const text = summaryText();
            if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => {});
            else {
              const ta = document.createElement("textarea");
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              try { document.execCommand("copy"); } catch { /* ignore */ }
              document.body.removeChild(ta);
            }
          }}
        >
          Copy Summary
        </button>
        <button
          type="button"
          className="ghost"
          id="share-card-web-share"
          onClick={() => {
            if (!ref.current || !navigator.share) return;
            ref.current.toBlob((blob) => {
              if (!blob) return;
              const file = new File([blob], "arcade-card.png", { type: "image/png" });
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: "My Arcade Profile", text: "Check out my arcade stats!" }).catch(() => {});
              } else {
                navigator.share({ title: "My Arcade Profile", text: "I've played " + (getProfile().gamesPlayed || 0) + " arcade games!" }).catch(() => {});
              }
            }, "image/png");
          }}
        >
          Share via Web Share
        </button>
      </div>
    </div>
  );
}
