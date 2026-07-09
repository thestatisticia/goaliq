"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Match, MatchEvent, TeamMatchStatistics } from "@/lib/types";
import { isLive, formatMatchTime, decidedOnPenalties, hasPenaltyScore, isPenaltyShootout, formatMatchScore, regulationScore, cn } from "@/lib/utils";
import { MatchBriefing } from "@/components/MatchBriefing";
import { PremiumUnlock } from "@/components/PremiumUnlock";
import { AskCopilotCard } from "@/components/AskCopilotCard";
import { MatchEventsList, MatchStatisticsGrid } from "@/components/MatchStatsPanel";

export default function MatchPage() {
  const params = useParams();
  const id = Number(params.id);
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [statistics, setStatistics] = useState<TeamMatchStatistics[]>([]);
  const [referee, setReferee] = useState<string | null>(null);
  const [statsAvailable, setStatsAvailable] = useState(false);
  const [extrasNote, setExtrasNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/matches/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setMatch(data.match);
        setEvents(data.events ?? []);
        setStatistics(data.statistics ?? []);
        setReferee(data.referee ?? null);
        setStatsAvailable(data.statsAvailable ?? false);
        setExtrasNote(data.extrasNote ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!match || !isLive(match.fixture.status.short)) return;

    const ms = isPenaltyShootout(match.fixture.status.short) ? 10_000 : 15_000;
    const interval = setInterval(() => {
      fetch(`/api/matches/${id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          setMatch(data.match);
          setEvents(data.events ?? []);
          setStatistics(data.statistics ?? []);
        });
    }, ms);
    return () => clearInterval(interval);
  }, [id, match?.fixture.status.short]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-goaliq-accent border-t-transparent" />
      </div>
    );
  }

  if (!match) {
    return <p className="text-center text-gray-500 py-20">Match not found</p>;
  }

  const live = isLive(match.fixture.status.short);
  const onPens = decidedOnPenalties(match);
  const validPens = hasPenaltyScore(match);
  const inShootout = isPenaltyShootout(match.fixture.status.short);
  const reg = regulationScore(match);
  const pens = match.goals?.penalties;
  const scores = formatMatchScore(match);
  const showPenTally = (inShootout || (onPens && validPens)) && pens;
  const context = {
    matchId: match.fixture.id,
    homeTeam: match.teams.home.name,
    awayTeam: match.teams.away.name,
    score: scores.suffix ? `${scores.main} ${scores.suffix}` : scores.main,
    status: formatMatchTime(match.fixture.status.short, match.fixture.status.elapsed),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-6 text-center">
        {live && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-goaliq-live mb-4">
            <span className="h-2 w-2 rounded-full bg-goaliq-live animate-pulse" />
            LIVE {context.status}
          </span>
        )}

        {showPenTally && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-goaliq-gold mb-1">
              {inShootout ? "Penalty shootout · live" : "Penalty shootout"}
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {pens?.home ?? 0} – {pens?.away ?? 0}
            </p>
            {scores.regulation && (
              <p className="text-sm text-gray-400 mt-1">After extra time · {scores.regulation}</p>
            )}
          </div>
        )}

        {onPens && !showPenTally && (
          <p className="text-sm text-goaliq-gold mb-2">{scores.suffix ?? "Decided on penalties"}</p>
        )}

        {match.goals?.halfTime && !onPens && (
          <p className="text-sm text-gray-400 mb-2">
            Half-time: {match.goals.halfTime.home ?? "-"} – {match.goals.halfTime.away ?? "-"}
          </p>
        )}

        <div className="flex items-center justify-center gap-8 my-6">
          <TeamBlock
            team={match.teams.home}
            score={showPenTally ? pens!.home : reg.home}
            highlight={match.teams.home.winner === true}
          />
          <span className="text-3xl font-bold text-gray-600">{showPenTally ? "pens" : "–"}</span>
          <TeamBlock
            team={match.teams.away}
            score={showPenTally ? pens!.away : reg.away}
            highlight={match.teams.away.winner === true}
          />
        </div>

        {match.fixture.venue && (
          <p className="text-sm text-gray-500">
            {match.fixture.venue.name}
            {match.fixture.venue.city ? `, ${match.fixture.venue.city}` : ""}
          </p>
        )}
        {referee && <p className="text-xs text-gray-600 mt-1">Referee: {referee}</p>}
      </div>

      <MatchBriefing matchId={id} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-5">
          <h2 className="font-semibold mb-3">Match Events</h2>
          <MatchEventsList events={events} />
        </div>
        <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-5">
          <h2 className="font-semibold mb-3">Statistics</h2>
          <MatchStatisticsGrid statistics={statistics} />
        </div>
      </div>

      {(extrasNote || !statsAvailable) && (
        <p className={`text-xs text-center ${extrasNote ? "text-amber-400/90" : "text-gray-500"}`}>
          {extrasNote ??
            "Goal scorers, cards, and team stats need API-Football — football-data.org only provides scores for WC 2026."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PremiumUnlock matchId={id} type="analysis" homeTeamName={match.teams.home.name} awayTeamName={match.teams.away.name} />
        <PremiumUnlock
          matchId={id}
          team1Id={match.teams.home.id}
          team2Id={match.teams.away.id}
          homeTeamName={match.teams.home.name}
          awayTeamName={match.teams.away.name}
          type="h2h"
        />
      </div>

      <AskCopilotCard context={context} />
    </div>
  );
}

function TeamBlock({
  team,
  score,
  highlight,
}: {
  team: { name: string; logo: string; winner?: boolean | null };
  score: number | null;
  highlight?: boolean;
}) {
  const name = team?.name?.trim() || "TBD";
  const logo = team?.logo ?? "";

  return (
    <div className="flex flex-col items-center gap-2">
      {logo ? (
        <Image src={logo} alt={name} width={64} height={64} className="rounded-full" unoptimized />
      ) : (
        <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl">
          {name[0] ?? "?"}
        </div>
      )}
      <p className={cn("font-semibold", highlight && "text-goaliq-accent")}>{name}</p>
      {score !== null && (
        <p className={cn("text-4xl font-bold", highlight && "text-goaliq-accent")}>{score}</p>
      )}
    </div>
  );
}
