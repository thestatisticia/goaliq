"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Match, MatchEvent, TeamMatchStatistics } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { MatchEventsList, MatchStatisticsGrid } from "./MatchStatsPanel";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn, isLive, isPenaltyShootout, hasPenaltyScore, formatMatchScore } from "@/lib/utils";

interface MatchDetailResponse {
  match?: Match;
  events?: MatchEvent[];
  statistics?: TeamMatchStatistics[];
  statsAvailable?: boolean;
  error?: string;
}

export function LiveMatchPanel({ match: initialMatch }: { match: Match }) {
  const [open, setOpen] = useState(true);
  const [detail, setDetail] = useState<MatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const displayMatch = detail?.match ?? initialMatch;
  const inShootout =
    isPenaltyShootout(displayMatch.fixture.status.short) || hasPenaltyScore(displayMatch);
  const isLiveMatch =
    isLive(displayMatch.fixture.status.short) || isPenaltyShootout(displayMatch.fixture.status.short);
  const pollMs = isLiveMatch ? 20_000 : 0;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadDetail(showSpinner: boolean) {
      if (showSpinner) setLoading(true);
      setFetchError(null);
      try {
        const r = await fetch(`/api/matches/${initialMatch.fixture.id}`);
        const data: MatchDetailResponse = await r.json();
        if (cancelled) return;
        if (!r.ok || !data.match) {
          setDetail(null);
          setFetchError(data.error ?? "Could not load match details");
          return;
        }
        setDetail(data);
      } catch {
        if (!cancelled) {
          setDetail(null);
          setFetchError("Could not load match details");
        }
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    }

    loadDetail(true);
    if (!pollMs) return;

    const interval = setInterval(() => loadDetail(false), pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [initialMatch.fixture.id, open, pollMs]);

  const halfTime = displayMatch.goals?.halfTime;
  const events = detail?.events ?? [];
  const statistics = detail?.statistics ?? [];
  const scoreLines = formatMatchScore(displayMatch);

  return (
    <div className="rounded-xl border border-goaliq-live/30 bg-goaliq-card overflow-hidden">
      <MatchCard match={displayMatch} />
      <div className="border-t border-goaliq-border/50 px-4 pb-4">
        {inShootout && (
          <div className="py-3 text-center border-b border-goaliq-border/30 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-goaliq-gold mb-1">
              Penalty shootout {isPenaltyShootout(displayMatch.fixture.status.short) ? "· live" : ""}
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {displayMatch.goals.penalties?.home ?? 0} – {displayMatch.goals.penalties?.away ?? 0}
            </p>
            {scoreLines.regulation && (
              <p className="text-xs text-gray-500 mt-1">After extra time · {scoreLines.regulation}</p>
            )}
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between py-3 text-sm text-goaliq-accent hover:text-goaliq-accent/80"
        >
          <span>{open ? "Hide" : "Show"} live stats & events</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {open && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-goaliq-accent border-t-transparent" />
              </div>
            ) : fetchError ? (
              <p className="text-xs text-gray-500 text-center py-2">{fetchError}</p>
            ) : (
              <>
                {halfTime && !inShootout && (
                  <p className="text-xs text-gray-500 text-center">
                    HT {halfTime.home ?? "-"} – {halfTime.away ?? "-"}
                  </p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-black/20 p-3">
                    <h3 className="text-xs font-semibold text-goaliq-gold mb-2 uppercase">Match Events</h3>
                    <MatchEventsList events={events} />
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <h3 className="text-xs font-semibold text-goaliq-gold mb-2 uppercase">Statistics</h3>
                    <MatchStatisticsGrid statistics={statistics} />
                  </div>
                </div>
              </>
            )}
            <Link
              href={`/match/${initialMatch.fixture.id}`}
              className={cn(
                "flex items-center justify-center gap-1 text-xs text-goaliq-accent hover:underline"
              )}
            >
              Full match page <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
