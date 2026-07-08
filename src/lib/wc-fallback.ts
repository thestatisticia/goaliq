import type { Match } from "./types";

export interface WorldCupTeam {
  id: number;
  name: string;
  logo: string;
}

/** Seed data when API-Football quota is exhausted — from live API snapshot */
export const WC_FALLBACK_TEAMS: WorldCupTeam[] = [
  { id: 26, name: "Argentina", logo: "https://media.api-sports.io/football/teams/26.png" },
  { id: 1, name: "Belgium", logo: "https://media.api-sports.io/football/teams/1.png" },
  { id: 8, name: "Colombia", logo: "https://media.api-sports.io/football/teams/8.png" },
  { id: 32, name: "Egypt", logo: "https://media.api-sports.io/football/teams/32.png" },
  { id: 10, name: "England", logo: "https://media.api-sports.io/football/teams/10.png" },
  { id: 16, name: "Mexico", logo: "https://media.api-sports.io/football/teams/16.png" },
  { id: 27, name: "Portugal", logo: "https://media.api-sports.io/football/teams/27.png" },
  { id: 9, name: "Spain", logo: "https://media.api-sports.io/football/teams/9.png" },
  { id: 15, name: "Switzerland", logo: "https://media.api-sports.io/football/teams/15.png" },
  { id: 2384, name: "USA", logo: "https://media.api-sports.io/football/teams/2384.png" },
];

function m(
  id: number,
  date: string,
  status: string,
  statusLong: string,
  round: string,
  home: WorldCupTeam,
  away: WorldCupTeam,
  gh: number | null,
  ga: number | null
): Match {
  return {
    fixture: {
      id,
      date,
      status: { short: status, long: statusLong, elapsed: status === "FT" ? 90 : null },
      venue: null,
    },
    league: { id: 1, name: "World Cup", season: 2026, round },
    teams: {
      home: { ...home, winner: gh !== null && ga !== null ? (gh > ga ? true : gh < ga ? false : null) : null },
      away: { ...away, winner: gh !== null && ga !== null ? (ga > gh ? true : ga < gh ? false : null) : null },
    },
    goals: { home: gh, away: ga },
  };
}

export const WC_FALLBACK_MATCHES: Match[] = [];

// Fix match data with correct teams from API
export function getFallbackMatches(): Match[] {
  const t = Object.fromEntries(WC_FALLBACK_TEAMS.map((x) => [x.name, x])) as Record<string, WorldCupTeam>;
  return [
    m(1576801, "2026-07-06T01:00:00+00:00", "FT", "Match Finished", "Round of 16", t.Mexico, t.England, 2, 3),
    m(1576802, "2026-07-06T19:00:00+00:00", "FT", "Match Finished", "Round of 16", t.Portugal, t.Spain, 0, 1),
    m(1576803, "2026-07-07T00:00:00+00:00", "FT", "Match Finished", "Round of 16", t.USA, t.Belgium, 1, 4),
    m(1576804, "2026-07-07T16:00:00+00:00", "NS", "Not Started", "Round of 16", t.Argentina, t.Egypt, null, null),
    m(1576805, "2026-07-07T20:00:00+00:00", "NS", "Not Started", "Round of 16", t.Switzerland, t.Colombia, null, null),
  ];
}

const FALLBACK_IDS = new Set([1576801, 1576802, 1576803, 1576804, 1576805]);

/** True when showing the hardcoded 5-match offline seed — not real API data. */
export function isFallbackDataset(matches: Match[]): boolean {
  return matches.length > 0 && matches.length <= 5 && matches.every((m) => FALLBACK_IDS.has(m.fixture.id));
}
