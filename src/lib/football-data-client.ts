import { getCached, setCached, CACHE_TTL } from "./cache";

const BASE_URL = "https://api.football-data.org/v4";

export const FD_WC_CODE = "WC";
export const FD_WC_SEASON = "2026";

export interface FdTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FdScore {
  winner: string | null;
  duration?: string | null;
  fullTime: { home: number | null; away: number | null };
  halfTime?: { home: number | null; away: number | null };
  extraTime?: { home: number | null; away: number | null };
  penalties?: { home: number | null; away: number | null };
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  injuryTime?: number | null;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: FdTeam | null;
  awayTeam: FdTeam | null;
  score: FdScore;
  venue?: string | null;
  goals?: FdGoal[];
  bookings?: FdBooking[];
  substitutions?: FdSubstitution[];
  referees?: { name: string }[];
}

export interface FdGoal {
  minute: number;
  injuryTime: number | null;
  type: string;
  team: { id: number; name: string };
  scorer: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  score: { home: number; away: number };
}

export interface FdBooking {
  minute: number;
  team: { id: number; name: string };
  player: { id: number; name: string };
  card: string;
}

export interface FdSubstitution {
  minute: number;
  team: { id: number; name: string };
  playerOut: { id: number; name: string };
  playerIn: { id: number; name: string };
}

interface FdMatchesResponse {
  matches: FdMatch[];
}

interface FdTeamsResponse {
  teams: FdTeam[];
}

export interface FdStandingsResponse {
  standings: {
    type: string;
    group: string | null;
    table: {
      position: number;
      team: FdTeam;
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      form: string | null;
    }[];
  }[];
}

function getFootballDataKey(): string | null {
  const key = process.env.FOOTBALL_DATA_KEY?.trim();
  if (!key) return null;
  return key;
}

export function isFootballDataConfigured(): boolean {
  return getFootballDataKey() !== null;
}

export async function footballDataRequest<T>(path: string, cacheKey: string, ttlMs: number): Promise<T> {
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const key = getFootballDataKey();
  if (!key) throw new Error("FOOTBALL_DATA_KEY is not set");

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": key },
    cache: "no-store",
  });

  if (res.status === 429) throw new Error("FD_RATE_LIMIT");

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as T;
  setCached(cacheKey, data, ttlMs);
  return data;
}

export async function getFdWorldCupMatches(): Promise<FdMatch[]> {
  const data = await footballDataRequest<FdMatchesResponse>(
    `/competitions/${FD_WC_CODE}/matches?season=${FD_WC_SEASON}`,
    `fd-wc-matches-${FD_WC_SEASON}`,
    CACHE_TTL.tournament
  );
  return data.matches ?? [];
}

export async function getFdWorldCupTeams(): Promise<FdTeam[]> {
  const data = await footballDataRequest<FdTeamsResponse>(
    `/competitions/${FD_WC_CODE}/teams?season=${FD_WC_SEASON}`,
    `fd-wc-teams-${FD_WC_SEASON}`,
    CACHE_TTL.tournament
  );
  return data.teams ?? [];
}

export async function getFdMatchById(id: number): Promise<FdMatch | null> {
  try {
    const data = await footballDataRequest<FdMatch>(`/matches/${id}`, `fd-match-${id}`, CACHE_TTL.matchDetail);
    return data?.id ? data : null;
  } catch {
    return null;
  }
}

export async function getFdWorldCupMatchesByDate(date: string): Promise<FdMatch[]> {
  const data = await footballDataRequest<{ matches: (FdMatch & { competition?: { code?: string } })[] }>(
    `/matches?dateFrom=${date}&dateTo=${date}`,
    `fd-wc-day-${date}`,
    CACHE_TTL.today
  );
  return (data.matches ?? []).filter((m) => m.competition?.code === FD_WC_CODE);
}

export async function getFdLiveWorldCupMatches(): Promise<FdMatch[]> {
  const data = await footballDataRequest<FdMatchesResponse>(
    `/matches?competitions=${FD_WC_CODE}&status=LIVE,IN_PLAY,PAUSED`,
    `fd-wc-live`,
    CACHE_TTL.live
  );
  return data.matches ?? [];
}

export async function getFdHeadToHead(matchId: number, limit = 10): Promise<FdMatch[]> {
  const data = await footballDataRequest<FdMatchesResponse>(
    `/matches/${matchId}/head2head?limit=${limit}`,
    `fd-h2h-${matchId}`,
    CACHE_TTL.h2h
  );
  return data.matches ?? [];
}

export async function getFdTeamMatches(teamId: number, status?: string): Promise<FdMatch[]> {
  let path = `/teams/${teamId}/matches?competitions=${FD_WC_CODE}&season=${FD_WC_SEASON}&limit=20`;
  if (status) path += `&status=${status}`;
  const data = await footballDataRequest<FdMatchesResponse>(
    path,
    `fd-team-${teamId}-${status ?? "all"}`,
    CACHE_TTL.teamForm
  );
  return data.matches ?? [];
}

export async function getFdStandings(): Promise<FdStandingsResponse> {
  return footballDataRequest<FdStandingsResponse>(
    `/competitions/${FD_WC_CODE}/standings?season=${FD_WC_SEASON}`,
    `fd-wc-standings-${FD_WC_SEASON}`,
    CACHE_TTL.standings
  );
}
