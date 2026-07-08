import type { Match } from "./types";

const FINISHED = new Set(["FT", "AET", "PEN"]);

/** Knockout round order for bracket propagation (lower = earlier round). */
const ROUND_ORDER: [string, number][] = [
  ["round of 32", 1],
  ["last 32", 1],
  ["last_32", 1],
  ["round of 16", 2],
  ["last 16", 2],
  ["last_16", 2],
  ["quarter", 3],
  ["semi", 4],
  ["third place", 5],
  ["final", 6],
];

export function isTbdTeamName(name: string | undefined | null): boolean {
  return !name?.trim() || name.trim().toUpperCase() === "TBD";
}

export function getKnockoutRoundOrder(round: string): number {
  const lower = round.toLowerCase();
  if (lower.includes("group")) return -1;
  for (const [key, order] of ROUND_ORDER) {
    if (lower.includes(key)) return order;
  }
  return -1;
}

function isFinishedMatch(m: Match): boolean {
  return FINISHED.has(m.fixture.status.short);
}

/** Winner of a finished knockout tie (incl. penalties). */
export function getKnockoutWinner(m: Match): Match["teams"]["home"] | null {
  if (!isFinishedMatch(m)) return null;

  if (m.teams.home.winner === true) return { ...m.teams.home, winner: null };
  if (m.teams.away.winner === true) return { ...m.teams.away, winner: null };

  const h = m.goals?.home;
  const a = m.goals?.away;
  if (h != null && a != null) {
    if (h > a) return { ...m.teams.home, winner: null };
    if (a > h) return { ...m.teams.away, winner: null };
    const pens = m.goals?.penalties;
    if (pens?.home != null && pens?.away != null && pens.home !== pens.away) {
      return pens.home > pens.away
        ? { ...m.teams.home, winner: null }
        : { ...m.teams.away, winner: null };
    }
  }
  return null;
}

export function pickRicherTeam(
  existing: Match["teams"]["home"],
  overlay: Match["teams"]["home"]
): Match["teams"]["home"] {
  const exTbd = isTbdTeamName(existing.name);
  const ovTbd = isTbdTeamName(overlay.name);
  if (exTbd && !ovTbd) return overlay;
  if (!exTbd && ovTbd) return existing;
  if (!ovTbd && overlay.id) return overlay;
  if (!exTbd && existing.id) return existing;
  return overlay;
}

/** Fill TBD knockout slots from winners of the previous round (API often lags). */
export function applyKnockoutWinners(matches: Match[]): Match[] {
  const result = matches.map((m) => ({
    ...m,
    teams: {
      home: { ...m.teams.home },
      away: { ...m.teams.away },
    },
  }));

  const byRound = new Map<number, Match[]>();
  for (const m of result) {
    const order = getKnockoutRoundOrder(m.league.round ?? "");
    if (order < 0) continue;
    const list = byRound.get(order) ?? [];
    list.push(m);
    byRound.set(order, list);
  }

  const orders = Array.from(byRound.keys()).sort((a, b) => a - b);
  for (let ri = 1; ri < orders.length; ri++) {
    const prevRound = byRound
      .get(orders[ri - 1])!
      .slice()
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
    const currRound = byRound
      .get(orders[ri])!
      .slice()
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

    for (let i = 0; i < currRound.length; i++) {
      const feederA = prevRound[i * 2];
      const feederB = prevRound[i * 2 + 1];
      const winnerA = feederA ? getKnockoutWinner(feederA) : null;
      const winnerB = feederB ? getKnockoutWinner(feederB) : null;
      const idx = result.findIndex((m) => m.fixture.id === currRound[i].fixture.id);
      if (idx < 0) continue;

      if (isTbdTeamName(result[idx].teams.home.name) && winnerA) {
        result[idx].teams.home = { ...winnerA, winner: null };
      }
      if (isTbdTeamName(result[idx].teams.away.name) && winnerB) {
        result[idx].teams.away = { ...winnerB, winner: null };
      }
    }
  }

  return result;
}
