"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";
import { formatMatchScore, formatMatchTime, regulationScore, shouldShowScore } from "@/lib/utils";
import { dashboardApiUrl } from "@/lib/dashboard-client";
import { GoaliqWordmark } from "@/components/GoaliqWordmark";
import { PRICING } from "@/lib/payments";

function HeroMatchRow({
  match,
  live,
}: {
  match: Match;
  live?: boolean;
}) {
  const scoreObj = formatMatchScore(match);
  const reg = regulationScore(match);
  const showScore = shouldShowScore(match.fixture.status.short);
  const minute = live
    ? formatMatchTime(match.fixture.status.short, match.fixture.status.elapsed)
    : match.fixture.status.short === "NS"
      ? new Date(match.fixture.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : "FT";

  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs ${
        live ? "border-goaliq-live/30 bg-goaliq-live/5" : "border-goaliq-border bg-goaliq-surface/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-goaliq-fg/90">{match.teams.home.name}</span>
        <span className="shrink-0 px-1 text-center font-semibold tabular-nums text-goaliq-fg">
          {showScore && reg.home != null && reg.away != null ? (
            <>
              {reg.home}–{reg.away}
              {scoreObj.suffix ? <span className="ml-1 font-normal text-goaliq-muted">{scoreObj.suffix}</span> : null}
            </>
          ) : (
            <span className="font-normal text-goaliq-muted">vs</span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-goaliq-fg/90">{match.teams.away.name}</span>
        <span
          className={`shrink-0 text-[10px] ${live ? "text-goaliq-live font-semibold" : "text-goaliq-muted"}`}
        >
          {live ? minute : match.fixture.status.short === "NS" ? `Upcoming · ${minute}` : minute}
        </span>
      </div>
    </div>
  );
}

function HeroMatchSkeleton() {
  return (
    <div className="rounded-md border border-goaliq-border bg-goaliq-surface/60 px-3 py-2 text-xs animate-pulse">
      <div className="h-4 w-3/4 rounded bg-goaliq-border/40" />
    </div>
  );
}

export function HeroMockup() {
  const [featured, setFeatured] = useState<Match | null>(null);
  const [upcoming, setUpcoming] = useState<Match | null>(null);
  const [featuredLive, setFeaturedLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(dashboardApiUrl(), { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) return;

        const live: Match[] = data.live ?? [];
        const results: Match[] = data.results ?? [];
        const todayFixtures: Match[] = data.fixtures ?? [];
        const upcomingPool: Match[] =
          todayFixtures.length > 0 ? todayFixtures : (data.upcoming ?? []);

        let nextFeatured: Match | null = null;
        let nextFeaturedLive = false;

        if (live.length > 0) {
          nextFeatured = live[0];
          nextFeaturedLive = true;
        } else if (results.length > 0) {
          nextFeatured = results[0];
        }

        const featuredId = nextFeatured?.fixture.id;
        const next =
          upcomingPool.find(
            (m) =>
              m.fixture.id !== featuredId &&
              ["NS", "TBD"].includes(m.fixture.status.short) &&
              m.teams.home.name !== "TBD" &&
              m.teams.away.name !== "TBD"
          ) ??
          upcomingPool.find(
            (m) =>
              m.fixture.id !== featuredId &&
              m.teams.home.name !== "TBD" &&
              m.teams.away.name !== "TBD"
          ) ??
          null;

        setFeatured(nextFeatured);
        setFeaturedLive(nextFeaturedLive);
        setUpcoming(next);
      } catch {
        /* keep skeleton */
      } finally {
        setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const copilotTeam = featured?.teams.home.name ?? "France";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-goaliq-borderSubtle bg-goaliq-card shadow-card dark:border-goaliq-border dark:bg-gradient-to-b dark:from-[#0d1525] dark:to-[#090e17]">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-goaliq-accent/50 to-transparent opacity-60 dark:opacity-100" />

      <div className="relative p-5">
        <div className="mb-4 flex items-center gap-2 border-b border-goaliq-borderSubtle pb-3">
          <GoaliqWordmark size="sm" showTagline={false} />
          <span className="text-sm font-medium text-goaliq-muted">Dashboard</span>
          {featuredLive && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full border border-goaliq-live/20 bg-goaliq-live/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-goaliq-live">
              <span className="h-1.5 w-1.5 rounded-full bg-goaliq-live animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="space-y-2">
          {loading ? (
            <>
              <HeroMatchSkeleton />
              <HeroMatchSkeleton />
            </>
          ) : (
            <>
              {featured ? (
                <HeroMatchRow match={featured} live={featuredLive} />
              ) : (
                <HeroMatchSkeleton />
              )}
              {upcoming ? (
                <HeroMatchRow match={upcoming} />
              ) : (
                <HeroMatchSkeleton />
              )}
            </>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface p-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-goaliq-muted">Copilot</p>
          <p className="text-xs text-goaliq-fg/70">
            &quot;Win chances for {copilotTeam}?&quot; → Unlock intelligence
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-goaliq-accent/20 bg-goaliq-accent/5 py-2.5 dark:bg-goaliq-accent/10">
            <p className="text-lg font-bold tabular-nums text-goaliq-accent dark:text-goaliq-accent">61%</p>
            <p className="text-[10px] text-goaliq-muted">Win chance</p>
          </div>
          <div className="rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface py-2.5">
            <p className="text-lg font-bold tabular-nums text-goaliq-fg">WWDLW</p>
            <p className="text-[10px] text-goaliq-muted">Form</p>
          </div>
          <div className="rounded-lg border border-goaliq-gold/20 bg-goaliq-gold/5 py-2.5 dark:border-goaliq-gold/30 dark:bg-goaliq-gold/10">
            <p className="text-lg font-bold tabular-nums text-goaliq-gold">{PRICING.insight.usdc}</p>
            <p className="text-[10px] text-goaliq-muted">Per insight</p>
          </div>
        </div>
      </div>
    </div>
  );
}
