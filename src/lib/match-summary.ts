import type { Match, MatchEvent, StandingGroup, SummaryRow } from "./types";
import {
  decidedOnPenalties,
  hasPenaltyScore,
  isFinishedStatus,
  isLive,
  ninetyMinuteScore,
  regulationScore,
  shouldShowScore,
} from "./utils";

const FINISHED = new Set(["FT", "AET", "PEN"]);

export type { SummaryRow };

function standingForTeam(standings: StandingGroup[], teamId: number) {
  for (const group of standings) {
    const row = group.table.find((r) => r.team.id === teamId);
    if (row) return { group: group.group, row };
  }
  return null;
}

function h2hWinsThisTournament(h2h: Match[], homeId: number, awayId: number) {
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  for (const m of h2h) {
    if (!FINISHED.has(m.fixture.status.short)) continue;
    if (m.teams.home.winner === true) {
      if (m.teams.home.id === homeId) homeWins++;
      else if (m.teams.home.id === awayId) awayWins++;
    } else if (m.teams.away.winner === true) {
      if (m.teams.away.id === homeId) homeWins++;
      else if (m.teams.away.id === awayId) awayWins++;
    } else {
      const h = m.goals.home;
      const a = m.goals.away;
      if (h != null && a != null && h === a) draws++;
    }
  }

  return { homeWins, awayWins, draws };
}

function fmtStandingSlot(
  slot: { group: string; row: StandingGroup["table"][0] } | null
): string {
  if (!slot) return "—";
  const g = slot.group.replace(/^Group\s*/i, "").trim() || slot.group;
  return `Grp ${g} · #${slot.row.rank} (${slot.row.points} pts)`;
}

function goalsForAgainst(row: StandingGroup["table"][0]): string {
  if (row.goalsFor != null && row.goalsAgainst != null) {
    return `${row.goalsFor} / ${row.goalsAgainst}`;
  }
  const played = row.all.played;
  const gd = row.goalsDiff;
  const gf = Math.max(0, Math.round((played + gd) / 2));
  const ga = Math.max(0, played - gf);
  return `${gf} / ${ga}`;
}

/** Derived side-by-side rows from football-data.org scores + standings (no API-Football). */
export function buildMatchSummaryRows(
  match: Match,
  standings: StandingGroup[],
  h2h: Match[]
): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const homeId = match.teams.home.id;
  const awayId = match.teams.away.id;
  const homeStand = standingForTeam(standings, homeId);
  const awayStand = standingForTeam(standings, awayId);

  if (homeStand || awayStand) {
    rows.push({
      label: "Group standing",
      home: fmtStandingSlot(homeStand),
      away: fmtStandingSlot(awayStand),
    });
    rows.push({
      label: "Played (W-D-L)",
      home: homeStand
        ? `${homeStand.row.all.played} (${homeStand.row.all.win}-${homeStand.row.all.draw}-${homeStand.row.all.lose})`
        : "—",
      away: awayStand
        ? `${awayStand.row.all.played} (${awayStand.row.all.win}-${awayStand.row.all.draw}-${awayStand.row.all.lose})`
        : "—",
    });
    rows.push({
      label: "Goals for / against",
      home: homeStand ? goalsForAgainst(homeStand.row) : "—",
      away: awayStand ? goalsForAgainst(awayStand.row) : "—",
    });
    rows.push({
      label: "Goal difference",
      home: homeStand ? (homeStand.row.goalsDiff > 0 ? `+${homeStand.row.goalsDiff}` : String(homeStand.row.goalsDiff)) : "—",
      away: awayStand ? (awayStand.row.goalsDiff > 0 ? `+${awayStand.row.goalsDiff}` : String(awayStand.row.goalsDiff)) : "—",
    });
    if (homeStand?.row.form || awayStand?.row.form) {
      rows.push({
        label: "Form (tournament)",
        home: homeStand?.row.form ?? "—",
        away: awayStand?.row.form ?? "—",
      });
    }
  }

  const { homeWins, awayWins, draws } = h2hWinsThisTournament(h2h, homeId, awayId);
  if (homeWins + awayWins + draws > 0) {
    rows.push({
      label: "H2H this World Cup",
      home: `${homeWins} win${homeWins === 1 ? "" : "s"}`,
      away: `${awayWins} win${awayWins === 1 ? "" : "s"}`,
    });
    if (draws > 0) {
      rows.push({
        label: "H2H draws",
        home: String(draws),
        away: String(draws),
      });
    }
  }

  const ht = match.goals.halfTime;
  if (ht && (ht.home != null || ht.away != null) && shouldShowScore(match.fixture.status.short)) {
    rows.push({
      label: "Half-time",
      home: ht.home != null ? String(ht.home) : "—",
      away: ht.away != null ? String(ht.away) : "—",
    });
  }

  const reg = regulationScore(match);
  const at90 = ninetyMinuteScore(match);
  if (shouldShowScore(match.fixture.status.short) && reg.home != null && reg.away != null) {
    if (at90) {
      rows.push({
        label: "Full-time (90 min)",
        home: String(at90.home),
        away: String(at90.away),
      });
      rows.push({
        label: "After extra time",
        home: String(reg.home),
        away: String(reg.away),
      });
    } else {
      rows.push({
        label: isLive(match.fixture.status.short) ? "Score" : "Full-time",
        home: String(reg.home),
        away: String(reg.away),
      });
    }
  }

  if (hasPenaltyScore(match) || decidedOnPenalties(match)) {
    const pens = match.goals.penalties;
    rows.push({
      label: "Penalties",
      home: pens?.home != null ? String(pens.home) : "—",
      away: pens?.away != null ? String(pens.away) : "—",
    });
  }

  if (isLive(match.fixture.status.short) && match.fixture.status.elapsed != null) {
    rows.push({
      label: "Minute",
      home: `${match.fixture.status.elapsed}'`,
      away: match.fixture.status.long,
    });
  }

  return rows;
}

/** Score timeline when goal-by-goal events are unavailable. */
export function buildDerivedScoreEvents(match: Match): MatchEvent[] {
  const events: MatchEvent[] = [];
  const push = (minute: number, label: string, detail: string) => {
    events.push({
      time: { elapsed: minute, extra: null },
      team: { id: 0, name: "—", logo: "" },
      player: { name: label },
      type: "Info",
      detail,
    });
  };

  const ht = match.goals.halfTime;
  if (ht?.home != null && ht?.away != null) {
    push(45, "Half-time", `${ht.home}–${ht.away}`);
  }

  const reg = regulationScore(match);
  const at90 = ninetyMinuteScore(match);
  if (isFinishedStatus(match.fixture.status.short) || match.fixture.status.short === "PEN") {
    if (at90) {
      push(90, "Full-time (90 min)", `${at90.home}–${at90.away}`);
      if (reg.home != null && reg.away != null) {
        push(120, "After extra time", `${reg.home}–${reg.away}`);
      }
    } else if (reg.home != null && reg.away != null) {
      push(90, "Full-time", `${reg.home}–${reg.away}`);
    }
  }

  const pens = match.goals.penalties;
  if (hasPenaltyScore(match) && pens?.home != null && pens?.away != null) {
    push(120, "Penalty shootout", `${pens.home}–${pens.away}`);
  }

  return events;
}
