"use client";

import { useRef } from "react";
import { Download, Share2 } from "lucide-react";

interface PredictionShareCardProps {
  homeTeam: string;
  awayTeam: string;
  percentHome: string;
  percentAway: string;
  percentDraw?: string;
  round?: string;
}

export function PredictionShareCard({
  homeTeam,
  awayTeam,
  percentHome,
  percentAway,
  percentDraw,
  round,
}: PredictionShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const shareText = `GOALIQ Prediction\n${homeTeam} ${percentHome}\n${awayTeam} ${percentAway}${percentDraw ? `\nDraw ${percentDraw}` : ""}\n\nPowered by GOALIQ · Injective`;

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      /* ignore */
    }
  }

  function downloadPng() {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 340;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 600, 340);
    grad.addColorStop(0, "#0b1220");
    grad.addColorStop(1, "#111827");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 340);

    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 568, 308);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("GOALIQ PREDICTION", 32, 52);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(round ?? "FIFA World Cup 2026", 32, 72);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText(homeTeam, 32, 130);
    ctx.fillText(awayTeam, 32, 200);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(percentHome, 568, 130);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(percentAway, 568, 200);
    ctx.textAlign = "left";

    if (percentDraw) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(`Draw ${percentDraw}`, 32, 250);
    }

    ctx.fillStyle = "#64748b";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Powered by GOALIQ · Injective testnet", 32, 300);

    const link = document.createElement("a");
    link.download = `goaliq-${homeTeam}-vs-${awayTeam}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const homeNum = parseInt(percentHome, 10) || 0;
  const awayNum = parseInt(percentAway, 10) || 0;

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="rounded-xl border border-goaliq-accent/40 bg-gradient-to-br from-slate-900 to-slate-950 p-4"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-goaliq-accent mb-1">
          GOALIQ Prediction
        </p>
        {round && <p className="text-xs text-goaliq-muted mb-3">{round}</p>}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm font-semibold mb-1">
              <span>{homeTeam}</span>
              <span className="text-goaliq-accent">{percentHome}</span>
            </div>
            <div className="h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-goaliq-accent rounded-full" style={{ width: `${homeNum}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold mb-1">
              <span>{awayTeam}</span>
              <span className="text-goaliq-gold">{percentAway}</span>
            </div>
            <div className="h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-goaliq-gold rounded-full" style={{ width: `${awayNum}%` }} />
            </div>
          </div>
          {percentDraw && (
            <p className="text-xs text-goaliq-muted text-center">Draw {percentDraw}</p>
          )}
        </div>
        <p className="text-[10px] text-goaliq-muted mt-3 text-center">Powered by GOALIQ · Injective</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={downloadPng}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-goaliq-border py-2 text-xs font-medium hover:bg-white/5"
        >
          <Download className="h-3.5 w-3.5" /> Download card
        </button>
        <button
          type="button"
          onClick={copyShare}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-goaliq-border py-2 text-xs font-medium hover:bg-white/5"
        >
          <Share2 className="h-3.5 w-3.5" /> Copy text
        </button>
      </div>
    </div>
  );
}
