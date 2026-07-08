"use client";

import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import type { MatchBriefingData } from "@/lib/match-briefing";

export function MatchBriefing({ matchId }: { matchId: number }) {
  const [briefing, setBriefing] = useState<MatchBriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/briefing`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load briefing");
      setBriefing(data.briefing);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-goaliq-accent/30 bg-gradient-to-br from-goaliq-accent/10 to-transparent p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-goaliq-accent" />
          <div>
            <h2 className="font-semibold">AI Match Briefing</h2>
            <p className="text-xs text-goaliq-muted">One-tap summary from live tournament data</p>
          </div>
        </div>
        {!briefing && (
          <button
            onClick={load}
            disabled={loading}
            className="shrink-0 rounded-lg bg-goaliq-accent px-4 py-2 text-sm font-semibold text-goaliq-bg hover:bg-sky-300 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Get briefing
          </button>
        )}
      </div>

      {error && <p className="text-sm text-goaliq-live">{error}</p>}

      {briefing && (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-goaliq-accent font-semibold">
              {briefing.round} · {briefing.kickoff}
            </p>
            <h3 className="text-lg font-bold mt-1">
              {briefing.homeTeam} vs {briefing.awayTeam}
            </h3>
          </div>

          <ul className="space-y-2">
            {briefing.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-slate-300">
                <span className="text-goaliq-accent">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-black/25 p-3 text-xs">
            <div>
              <p className="text-goaliq-muted mb-1">{briefing.homeTeam} form</p>
              <p className="font-mono font-semibold text-white tracking-widest">{briefing.form.home}</p>
            </div>
            <div>
              <p className="text-goaliq-muted mb-1">{briefing.awayTeam} form</p>
              <p className="font-mono font-semibold text-white tracking-widest">{briefing.form.away}</p>
            </div>
          </div>

          {briefing.winProb && (
            <div className="rounded-lg border border-goaliq-gold/30 bg-goaliq-gold/5 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-goaliq-gold">Win probability</p>
              <div className="flex justify-between text-sm font-semibold">
                <span>{briefing.homeTeam} {briefing.winProb.home}</span>
                <span className="text-goaliq-muted">Draw {briefing.winProb.draw}</span>
                <span>{briefing.awayTeam} {briefing.winProb.away}</span>
              </div>
              <p className="text-xs text-goaliq-muted">
                Confidence: <span className="text-goaliq-gold">{briefing.winProb.confidence}</span>
              </p>
              {briefing.winProb.reasons.length > 0 && (
                <ul className="text-xs text-slate-400 space-y-1">
                  {briefing.winProb.reasons.map((r, i) => (
                    <li key={i}>→ {r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {briefing.watchFor && (
            <p className="text-xs text-slate-400 italic border-l-2 border-goaliq-accent pl-3">
              Watch for: {briefing.watchFor}
            </p>
          )}

          <p className="text-[10px] text-goaliq-muted">
            Unlock premium below for full H2H + tactical report (0.01 USDC).
          </p>
        </div>
      )}
    </div>
  );
}
