"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { LiveMatchPanel } from "./LiveMatchPanel";
import { Radio, Calendar, Clock, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "live" | "fixtures" | "upcoming" | "results" | "knockout" | "teams";

interface WcTeam {
  id: number;
  name: string;
  logo: string;
}

export function DashboardTabs() {
  const [tab, setTab] = useState<Tab>("live");
  const [live, setLive] = useState<Match[]>([]);
  const [fixtures, setFixtures] = useState<Match[]>([]);
  const [upcoming, setUpcoming] = useState<Match[]>([]);
  const [results, setResults] = useState<Match[]>([]);
  const [teams, setTeams] = useState<WcTeam[]>([]);
  const [knockout, setKnockout] = useState<
    { group: string; table: { rank: number; team: { name: string }; form: string | null }[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setLive(data.live ?? []);
        setFixtures(data.fixtures ?? []);
        setUpcoming(data.upcoming ?? []);
        setResults(data.results ?? []);
        setTeams(data.teams ?? []);
        setKnockout(data.standings ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
    const ms = live.length > 0 ? 15_000 : 45_000;
    const interval = setInterval(load, ms);
    return () => clearInterval(interval);
  }, [live.length]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "live", label: "Live", icon: <Radio className="h-4 w-4" />, count: live.length },
    { id: "fixtures", label: "Today", icon: <Calendar className="h-4 w-4" />, count: fixtures.length },
    { id: "upcoming", label: "Upcoming", icon: <Clock className="h-4 w-4" />, count: upcoming.length },
    { id: "results", label: "Results", icon: <Trophy className="h-4 w-4" />, count: results.length },
    { id: "knockout", label: "Knockout", icon: <Trophy className="h-4 w-4" />, count: knockout.length },
    { id: "teams", label: "Teams", icon: <Users className="h-4 w-4" />, count: teams.length },
  ];

  const resultsByRound = groupByRound(results);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-goaliq-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-goaliq-accent/20 text-goaliq-accent"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            {t.icon}
            {t.label}
            <span className="rounded-full bg-black/30 px-1.5 text-xs">{t.count}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-goaliq-live/40 bg-goaliq-live/10 p-3 text-sm text-goaliq-live">
          {error}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : (
        <>
          {tab === "live" && (
            live.length === 0 ? (
              <MatchGrid matches={live} empty="No live World Cup matches right now. Check Upcoming for the next kickoff." />
            ) : (
              <div className="space-y-4">
                {live.map((m) => (
                  <LiveMatchPanel key={m.fixture.id} match={m} />
                ))}
              </div>
            )
          )}
          {tab === "fixtures" && (
            <MatchGrid matches={fixtures} empty="No more matches scheduled for today." showKickoff />
          )}
          {tab === "upcoming" && (
            <MatchGrid
              matches={upcoming}
              empty="No upcoming World Cup fixtures on the calendar."
              showKickoff
            />
          )}
          {tab === "results" && (
            <div className="space-y-6">
              {resultsByRound.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">No completed World Cup matches yet.</p>
              ) : (
                resultsByRound.map(({ round, matches }) => (
                  <div key={round}>
                    <h3 className="text-sm font-semibold text-goaliq-gold mb-3">{round}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {matches.map((m) => (
                        <MatchCard key={m.fixture.id} match={m} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {tab === "knockout" && (
            <div className="space-y-4">
              {knockout.map((g) => (
                <div key={g.group} className="rounded-xl border border-goaliq-border bg-goaliq-card p-4">
                  <h3 className="font-semibold text-goaliq-gold mb-3">{g.group}</h3>
                  <div className="space-y-2">
                    {g.table.map((row) => (
                      <div
                        key={row.rank}
                        className="flex items-center justify-between text-sm border-b border-goaliq-border/30 pb-2"
                      >
                        <span className="text-gray-300">{row.form ?? row.team.name}</span>
                        <span className="text-goaliq-accent text-xs font-medium">{row.team.name} won</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "teams" && (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-goaliq-border bg-goaliq-card/50 px-3 py-2 text-sm"
                >
                  {t.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.logo} alt="" className="h-6 w-6 object-contain" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-700" />
                  )}
                  <span>{t.name}</span>
                </div>
              ))}
              {teams.length === 0 && (
                <p className="text-gray-500 text-sm col-span-full py-8 text-center">No teams loaded yet.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function groupByRound(matches: Match[]): { round: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const round = m.league.round ?? "World Cup";
    if (!map.has(round)) map.set(round, []);
    map.get(round)!.push(m);
  }
  return Array.from(map.entries()).map(([round, roundMatches]) => ({ round, matches: roundMatches }));
}

function MatchGrid({
  matches,
  empty,
  showKickoff,
}: {
  matches: Match[];
  empty: string;
  showKickoff?: boolean;
}) {
  if (matches.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">{empty}</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {matches.map((m) => (
        <MatchCard key={m.fixture.id} match={m} showKickoff={showKickoff} />
      ))}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-goaliq-accent border-t-transparent" />
    </div>
  );
}
