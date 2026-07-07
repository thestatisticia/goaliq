import { getCached, setCached, CACHE_TTL } from "./cache";
import { footballApiRequest } from "./api-football-client";
import type { MatchEvent, Team, TeamMatchStatistics } from "./types";
import type { Match } from "./types";

interface ApisportsEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo?: string };
  player: { id: number; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
}

interface ApisportsStatRow {
  team: { id: number; name: string; logo?: string };
  statistics: { type: string; value: number | string | null }[];
}

/** Resolve API-Football fixture id from team names + date (cached). */
export async function resolveApisportsFixtureId(match: Match): Promise<number | null> {
  const home = match.teams.home.name;
  const away = match.teams.away.name;
  if (!home || home === "TBD" || !away || away === "TBD") return null;

  const date = match.fixture.date.slice(0, 10);
  const cacheKey = `apisports-fid-${home}-${away}-${date}`;
  const cached = getCached<number>(cacheKey);
  if (cached) return cached;

  try {
    const fixtures = await footballApiRequest<
      { fixture: { id: number }; teams: { home: { name: string }; away: { name: string } }; league: { id: number } }[]
    >(`/fixtures?date=${date}`);

    const wc = fixtures.filter((f) => f.league?.id === 1);
    const hit = wc.find(
      (f) =>
        f.teams.home.name.toLowerCase() === home.toLowerCase() &&
        f.teams.away.name.toLowerCase() === away.toLowerCase()
    );
    if (hit) {
      setCached(cacheKey, hit.fixture.id, CACHE_TTL.matchDetail);
      return hit.fixture.id;
    }
  } catch {
    /* quota or error */
  }
  return null;
}

function mapEvent(e: ApisportsEvent): MatchEvent {
  const isPenaltyKick =
    e.type === "Penalty" ||
    /missed penalty|penalty/i.test(e.detail ?? "") ||
    (e.type === "Goal" && e.detail === "Penalty");
  return {
    time: { elapsed: e.time.elapsed, extra: e.time.extra },
    team: { id: e.team.id, name: e.team.name, logo: e.team.logo ?? "" },
    player: { name: e.player?.name ?? e.assist?.name ?? "Unknown" },
    type: isPenaltyKick ? "Penalty" : e.type,
    detail: e.detail || (isPenaltyKick ? "Penalty" : e.type),
  };
}

export async function fetchApisportsEvents(fixtureId: number, live = false): Promise<MatchEvent[]> {
  const cacheKey = `apisports-events-${fixtureId}`;
  const cached = getCached<MatchEvent[]>(cacheKey);
  if (cached && !live) return cached;

  try {
    const rows = await footballApiRequest<ApisportsEvent[]>(`/fixtures/events?fixture=${fixtureId}`);
    const events = rows.map(mapEvent);
    setCached(cacheKey, events, live ? 10_000 : CACHE_TTL.matchDetail);
    return events;
  } catch {
    return cached ?? [];
  }
}

export async function fetchApisportsStatistics(fixtureId: number): Promise<TeamMatchStatistics[]> {
  const cacheKey = `apisports-stats-${fixtureId}`;
  const cached = getCached<TeamMatchStatistics[]>(cacheKey);
  if (cached) return cached;

  try {
    const rows = await footballApiRequest<ApisportsStatRow[]>(`/fixtures/statistics?fixture=${fixtureId}`);
    const statistics = rows.map((r) => ({
      team: { id: r.team.id, name: r.team.name, logo: r.team.logo ?? "" },
      statistics: r.statistics,
    }));
    setCached(cacheKey, statistics, CACHE_TTL.matchDetail);
    return statistics;
  } catch {
    return [];
  }
}

export async function fetchApisportsMatchExtras(
  match: Match,
  opts?: { live?: boolean }
): Promise<{
  events: MatchEvent[];
  statistics: TeamMatchStatistics[];
}> {
  const fixtureId = await resolveApisportsFixtureId(match);
  if (!fixtureId) return { events: [], statistics: [] };

  const live = opts?.live ?? false;
  const [events, statistics] = await Promise.all([
    fetchApisportsEvents(fixtureId, live),
    fetchApisportsStatistics(fixtureId),
  ]);
  return { events, statistics };
}
