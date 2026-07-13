import type { Match, StandingGroup, MatchEvent, TeamMatchStatistics } from "./types";
import type { FdMatch, FdTeam, FdStandingsResponse } from "./football-data-client";
import { WC_LEAGUE_ID } from "./constants";

const WC_SEASON = 2026;

const STATUS_MAP: Record<string, { short: string; long: string }> = {
  FINISHED: { short: "FT", long: "Match Finished" },
  SCHEDULED: { short: "NS", long: "Not Started" },
  TIMED: { short: "NS", long: "Not Started" },
  IN_PLAY: { short: "LIVE", long: "In Play" },
  LIVE: { short: "LIVE", long: "Live" },
  PAUSED: { short: "HT", long: "Half Time" },
  HALFTIME: { short: "HT", long: "Half Time" },
  EXTRA_TIME: { short: "ET", long: "Extra Time" },
  PENALTY_SHOOTOUT: { short: "P", long: "Penalty Shootout" },
  POSTPONED: { short: "PST", long: "Postponed" },
  SUSPENDED: { short: "SUSP", long: "Suspended" },
  CANCELLED: { short: "CANC", long: "Cancelled" },
  AWARDED: { short: "FT", long: "Match Finished" },
};

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
  PLAYOFFS: "Play-offs",
};

function mapTeam(team: FdTeam | null, winner: string | null, side: "home" | "away"): Match["teams"]["home"] {
  if (!team?.name) return { id: team?.id ?? 0, name: "TBD", logo: team?.crest ?? "" };
  const isWinner =
    winner === null ? null : winner === "HOME_TEAM" ? side === "home" : winner === "AWAY_TEAM" ? side === "away" : false;
  return { id: team.id, name: team.name, logo: team.crest ?? "", winner: isWinner };
}

function formatRound(stage: string, group: string | null): string {
  if (stage === "GROUP_STAGE" && group) return group.replace(/_/g, " ");
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
}

export function mapFdMatch(fd: FdMatch): Match {
  let status = STATUS_MAP[fd.status] ?? { short: fd.status, long: fd.status };

  const pens = fd.score?.penalties;
  const decidedOnPens =
    fd.score?.duration === "PENALTY_SHOOTOUT" ||
    (pens?.home != null && pens?.away != null && pens.home !== pens.away);

  if (fd.status === "FINISHED" && decidedOnPens) {
    status = { short: "PEN", long: "Finished (penalties)" };
  }

  const home = fd.score?.fullTime?.home ?? null;
  const away = fd.score?.fullTime?.away ?? null;
  const elapsed = fd.minute ?? null;

  const extraTime = fd.score?.extraTime
    ? { home: fd.score.extraTime.home, away: fd.score.extraTime.away }
    : undefined;
  const penalties = pens ? { home: pens.home, away: pens.away } : undefined;

  return {
    fixture: {
      id: fd.id,
      date: fd.utcDate,
      status: { ...status, elapsed: elapsed ?? null },
      venue: fd.venue ? { name: fd.venue, city: "" } : null,
    },
    league: {
      id: WC_LEAGUE_ID,
      name: "FIFA World Cup",
      season: WC_SEASON,
      round: formatRound(fd.stage, fd.group),
    },
    teams: {
      home: mapTeam(fd.homeTeam, fd.score?.winner ?? null, "home"),
      away: mapTeam(fd.awayTeam, fd.score?.winner ?? null, "away"),
    },
    goals: {
      home,
      away,
      halfTime: fd.score?.halfTime
        ? { home: fd.score.halfTime.home, away: fd.score.halfTime.away }
        : undefined,
      extraTime,
      penalties,
    },
  };
}

export function mapFdGoalsToEvents(fd: FdMatch): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (const g of fd.goals ?? []) {
    const isShootoutKick = g.type === "PENALTY_SHOOTOUT" || (g.minute >= 120 && g.type === "PENALTY");
    events.push({
      time: { elapsed: g.minute, extra: g.injuryTime },
      team: { id: g.team.id, name: g.team.name, logo: "" },
      player: { name: g.scorer.name },
      type: isShootoutKick ? "Penalty" : "Goal",
      detail:
        g.type === "PENALTY"
          ? "Penalty"
          : g.type === "PENALTY_SHOOTOUT"
            ? "Penalty (shootout)"
            : g.type === "OWN"
              ? "Own Goal"
              : "Normal Goal",
    });
  }
  for (const b of fd.bookings ?? []) {
    events.push({
      time: { elapsed: b.minute, extra: null },
      team: { id: b.team.id, name: b.team.name, logo: "" },
      player: { name: b.player.name },
      type: "Card",
      detail: b.card === "YELLOW" ? "Yellow Card" : b.card === "RED" ? "Red Card" : b.card,
    });
  }
  for (const s of fd.substitutions ?? []) {
    events.push({
      time: { elapsed: s.minute, extra: null },
      team: { id: s.team.id, name: s.team.name, logo: "" },
      player: { name: `${s.playerOut.name} → ${s.playerIn.name}` },
      type: "subst",
      detail: "Substitution",
    });
  }
  return events.sort((a, b) => a.time.elapsed - b.time.elapsed);
}

export function mapFdStatistics(fd: FdMatch): TeamMatchStatistics[] {
  const rows: TeamMatchStatistics[] = [];
  if (fd.homeTeam && "statistics" in fd.homeTeam && fd.homeTeam.statistics) {
    rows.push({
      team: mapTeam(fd.homeTeam, null, "home"),
      statistics: Object.entries(fd.homeTeam.statistics as Record<string, number>).map(([type, value]) => ({
        type: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
      })),
    });
  }
  if (fd.awayTeam && "statistics" in fd.awayTeam && fd.awayTeam.statistics) {
    rows.push({
      team: mapTeam(fd.awayTeam, null, "away"),
      statistics: Object.entries(fd.awayTeam.statistics as Record<string, number>).map(([type, value]) => ({
        type: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
      })),
    });
  }
  return rows;
}

export function mapFdStandings(data: FdStandingsResponse): StandingGroup[] {
  if (!data.standings?.length) return [];

  return data.standings.map((group) => ({
    group: group.group?.replace(/_/g, " ") ?? group.type ?? "Standings",
    table: group.table.map((row) => ({
      rank: row.position,
      team: { id: row.team.id, name: row.team.name, logo: row.team.crest ?? "" },
      points: row.points,
      all: { played: row.playedGames, win: row.won, draw: row.draw, lose: row.lost },
      goalsDiff: row.goalDifference,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      form: row.form,
    })),
  }));
}

export function mapFdTeam(team: FdTeam) {
  return { id: team.id, name: team.name, logo: team.crest ?? "" };
}
