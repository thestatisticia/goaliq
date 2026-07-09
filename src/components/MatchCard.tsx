"use client";

import Link from "next/link";
import Image from "next/image";
import type { Match } from "@/lib/types";
import {
  cn,
  isLive,
  formatMatchTime,
  shouldShowScore,
  formatMatchScore,
  hasPenaltyScore,
  decidedOnPenalties,
  isPenaltyShootout,
  regulationScore,
  isFinishedStatus,
} from "@/lib/utils";

interface MatchCardProps {
  match: Match;
  compact?: boolean;
  showKickoff?: boolean;
}

export function MatchCard({ match, compact, showKickoff }: MatchCardProps) {
  const live = isLive(match.fixture.status.short);
  const onPens = decidedOnPenalties(match);
  const inShootout = isPenaltyShootout(match.fixture.status.short);
  const validPens = hasPenaltyScore(match);
  const { home, away } = match.teams;
  const displayScores = shouldShowScore(match.fixture.status.short);
  const scores = formatMatchScore(match);
  const reg = regulationScore(match);
  const pens = match.goals?.penalties;
  const kickoffLabel = new Date(match.fixture.date).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const winnerName =
    home.winner === true ? home.name : away.winner === true ? away.name : null;

  // Live shootout: show pen tally. Finished: show regulation + pen suffix.
  const showPenTally = (inShootout || (onPens && validPens)) && pens;
  const cardScores = showPenTally
    ? { home: pens!.home, away: pens!.away }
    : { home: reg.home, away: reg.away };

  return (
    <Link
      href={`/match/${match.fixture.id}`}
      className={cn(
        "block rounded-xl border border-goaliq-border bg-goaliq-card p-4 transition-all hover:border-goaliq-accent/50 hover:shadow-lg hover:shadow-goaliq-accent/5",
        live && "border-goaliq-live/30"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        {live ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-goaliq-live">
            <span className="h-2 w-2 rounded-full bg-goaliq-live animate-pulse" />
            LIVE {formatMatchTime(match.fixture.status.short, match.fixture.status.elapsed)}
          </span>
        ) : (
          <span className="text-xs text-goaliq-muted">
            {showKickoff
              ? kickoffLabel
              : onPens && isFinishedStatus(match.fixture.status.short)
                ? formatMatchTime("PEN", null)
                : formatMatchTime(match.fixture.status.short, match.fixture.status.elapsed)}
          </span>
        )}
        {match.fixture.venue && !compact && (
          <span className="text-xs text-goaliq-muted truncate max-w-[140px]">{match.fixture.venue.name}</span>
        )}
      </div>

      {showPenTally && scores.regulation && (
        <p className="text-center text-xs text-gray-500 mb-2">After ET · {scores.regulation}</p>
      )}

      {!showPenTally && onPens && scores.suffix && (
        <p className="text-center text-xs text-goaliq-gold mb-2">{scores.suffix}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <TeamRow
          team={home}
          score={displayScores ? cardScores.home : null}
          highlight={home.winner === true}
          align="left"
        />
        <span className="text-goaliq-muted text-sm font-mono">
          {showPenTally ? "pens" : onPens && validPens && scores.penalties ? scores.penalties : "vs"}
        </span>
        <TeamRow
          team={away}
          score={displayScores ? cardScores.away : null}
          highlight={away.winner === true}
          align="right"
        />
      </div>

      {winnerName && onPens && !live && (
        <p className="text-center text-[11px] text-goaliq-muted mt-2">{winnerName} advances</p>
      )}
    </Link>
  );
}

function TeamRow({
  team,
  score,
  align,
  highlight,
}: {
  team: { name: string; logo: string; winner?: boolean | null };
  score: number | null;
  align: "left" | "right";
  highlight?: boolean;
}) {
  const name = team?.name?.trim() || "TBD";
  const logo = team?.logo ?? "";

  return (
    <div className={cn("flex items-center gap-2 flex-1", align === "right" && "flex-row-reverse")}>
      {logo ? (
        <Image src={logo} alt={name} width={28} height={28} className="rounded-full" unoptimized />
      ) : (
        <div className="h-7 w-7 rounded-full bg-goaliq-surface border border-goaliq-borderSubtle flex items-center justify-center text-xs text-goaliq-fg">
          {name[0] ?? "?"}
        </div>
      )}
      <div className={cn(align === "right" && "text-right")}>
        <p className={cn("font-medium text-sm truncate max-w-[100px] text-goaliq-fg", highlight && "text-goaliq-accent")}>
          {name}
        </p>
        {score !== null && (
          <p className={cn("text-2xl font-bold tabular-nums", highlight && "text-goaliq-accent")}>{score}</p>
        )}
      </div>
    </div>
  );
}
