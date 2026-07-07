import type { FixturePrediction } from "./football-api";
import { getFallbackMatches, WC_FALLBACK_TEAMS, type WorldCupTeam } from "./wc-fallback";
import type { Match } from "./types";

/** Cached prediction snapshots when live API quota is exhausted */
const SNAPSHOTS: Record<number, Omit<FixturePrediction, "fixtureId" | "h2hMatches">> = {
  1576804: {
    home: { id: 26, name: "Argentina" },
    away: { id: 32, name: "Egypt" },
    round: "Round of 16",
    date: "2026-07-07T16:00:00+00:00",
    winner: { name: "Argentina", comment: "Win or draw" },
    percent: { home: "45%", draw: "45%", away: "10%" },
    advice: "Double chance : Argentina or draw",
    underOver: null,
    comparison: {
      form: { home: "60%", away: "40%" },
      att: { home: "61%", away: "39%" },
      def: { home: "57%", away: "43%" },
      poisson_distribution: { home: "59%", away: "41%" },
      total: { home: "59.3%", away: "40.8%" },
    },
    homeTeam: {
      id: 26,
      name: "Argentina",
      formString: "WWWW",
      played: 4,
      wins: 4,
      draws: 0,
      losses: 0,
      goalsFor: 11,
      goalsAgainst: 3,
      goalsForAvg: "2.8",
      goalsAgainstAvg: "0.8",
      formRating: "100%",
      attRating: "73%",
      defRating: "80%",
      formation: "4-4-2",
      recentMatches: [],
    },
    awayTeam: {
      id: 32,
      name: "Egypt",
      formString: "DWDW",
      played: 4,
      wins: 2,
      draws: 2,
      losses: 0,
      goalsFor: 7,
      goalsAgainst: 4,
      goalsForAvg: "1.8",
      goalsAgainstAvg: "1.0",
      formRating: "67%",
      attRating: "47%",
      defRating: "73%",
      formation: "4-2-3-1",
      recentMatches: [],
    },
  },
  1576805: {
    home: { id: 15, name: "Switzerland" },
    away: { id: 8, name: "Colombia" },
    round: "Round of 16",
    date: "2026-07-07T20:00:00+00:00",
    winner: { name: "Switzerland", comment: "Win or draw" },
    percent: { home: "50%", draw: "30%", away: "20%" },
    advice: "Competitive knockout — home edge slight",
    underOver: "Under 2.5",
    comparison: {
      form: { home: "55%", away: "45%" },
      att: { home: "52%", away: "48%" },
      def: { home: "54%", away: "46%" },
      total: { home: "53%", away: "47%" },
    },
    homeTeam: {
      id: 15,
      name: "Switzerland",
      formString: "WDWL",
      played: 4,
      wins: 2,
      draws: 1,
      losses: 1,
      goalsFor: 6,
      goalsAgainst: 5,
      goalsForAvg: "1.5",
      goalsAgainstAvg: "1.3",
      formRating: "58%",
      attRating: "50%",
      defRating: "62%",
      formation: "4-3-3",
      recentMatches: [],
    },
    awayTeam: {
      id: 8,
      name: "Colombia",
      formString: "WWDL",
      played: 4,
      wins: 2,
      draws: 1,
      losses: 1,
      goalsFor: 7,
      goalsAgainst: 6,
      goalsForAvg: "1.8",
      goalsAgainstAvg: "1.5",
      formRating: "62%",
      attRating: "55%",
      defRating: "48%",
      formation: "4-4-2",
      recentMatches: [],
    },
  },
};

function teamResults(teamId: number, matches: Match[]): string[] {
  return matches
    .filter((m) => m.teams.home.id === teamId || m.teams.away.id === teamId)
    .filter((m) => m.goals.home !== null)
    .map((m) => {
      const isHome = m.teams.home.id === teamId;
      const gf = isHome ? m.goals.home! : m.goals.away!;
      const ga = isHome ? m.goals.away! : m.goals.home!;
      const r = gf > ga ? "W" : gf < ga ? "L" : "D";
      return `${new Date(m.fixture.date).toLocaleDateString()} · ${r} · ${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`;
    });
}

export function getFallbackPrediction(fixtureId: number): FixturePrediction | null {
  const snap = SNAPSHOTS[fixtureId];
  if (!snap) return null;

  const matches = getFallbackMatches();
  const homeTeam = { ...snap.homeTeam, recentMatches: teamResults(snap.home.id, matches) };
  const awayTeam = { ...snap.awayTeam, recentMatches: teamResults(snap.away.id, matches) };

  return {
    fixtureId,
    ...snap,
    homeTeam,
    awayTeam,
    h2hMatches: matches.filter(
      (m) =>
        m.fixture.id === fixtureId ||
        ((m.teams.home.id === snap.home.id && m.teams.away.id === snap.away.id) ||
          (m.teams.home.id === snap.away.id && m.teams.away.id === snap.home.id))
    ),
  };
}

export function findFallbackFixture(team1Id: number, team2Id: number): Match | null {
  return (
    getFallbackMatches().find(
      (m) =>
        (m.teams.home.id === team1Id && m.teams.away.id === team2Id) ||
        (m.teams.home.id === team2Id && m.teams.away.id === team1Id)
    ) ?? null
  );
}

export function getFallbackTeam(id: number): WorldCupTeam | undefined {
  return WC_FALLBACK_TEAMS.find((t) => t.id === id);
}
