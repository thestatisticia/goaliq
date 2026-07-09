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

/**
 * FIFA World Cup 2026 knockout feeder paths (index into previous round, sorted by match id).
 * Chronological date order does NOT match bracket paths — using date caused wrong TBD fills.
 */
const FEEDER_PAIRS_BY_ROUND: Record<number, number[][]> = {
  /** Round of 32 → Round of 16 */
  2: [
    [0, 1],
    [2, 3],
    [8, 9],
    [10, 11],
    [4, 5],
    [6, 7],
    [12, 13],
    [14, 15],
  ],
  /** Round of 16 → Quarter-finals */
  3: [
    [0, 1],
    [4, 5],
    [2, 3],
    [6, 7],
  ],
  /** Quarter-finals → Semi-finals */
  4: [
    [0, 1],
    [2, 3],
  ],
  /** Semi-finals → Final */
  6: [[0, 1]],
};

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

function sortRoundMatches(matches: Match[]): Match[] {
  return matches.slice().sort((a, b) => a.fixture.id - b.fixture.id);
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

function feederPairIndexes(roundOrder: number, matchIndex: number): [number, number] {
  const pairs = FEEDER_PAIRS_BY_ROUND[roundOrder];
  const pair = pairs?.[matchIndex];
  if (pair && pair.length === 2) return [pair[0], pair[1]];
  return [matchIndex * 2, matchIndex * 2 + 1];
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
    const currOrder = orders[ri];
    if (currOrder === 5) continue; // third-place playoff uses semi losers — not propagated here

    const prevRound = sortRoundMatches(byRound.get(orders[ri - 1])!);
    const currRound = sortRoundMatches(byRound.get(currOrder)!);

    for (let i = 0; i < currRound.length; i++) {
      const [idxA, idxB] = feederPairIndexes(currOrder, i);
      const feederA = prevRound[idxA];
      const feederB = prevRound[idxB];
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
