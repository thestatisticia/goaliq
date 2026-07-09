import { getCached, setCached, CACHE_TTL } from "./cache";
import { footballApiRequest, getActiveApiFootballKeys } from "./api-football-client";
import type { MatchEvent, TeamMatchStatistics } from "./types";
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

type DateFixtureRow = {
  fixture: { id: number };
  teams: { home: { name: string }; away: { name: string } };
  league: { id: number };
};

async function loadApisportsFixturesForDate(date: string): Promise<DateFixtureRow[]> {
  const cacheKey = `apisports-date-fixtures-${date}`;
  const cached = getCached<DateFixtureRow[]>(cacheKey);
  if (cached) return cached;

  const fixtures = await footballApiRequest<DateFixtureRow[]>(`/fixtures?date=${date}`);
  setCached(cacheKey, fixtures, CACHE_TTL.apisportsDateFixtures);
  return fixtures;
}

/** Resolve API-Football fixture id from team names + date (cached). */
export async function resolveApisportsFixtureId(match: Match): Promise<number | null> {
  if (!getActiveApiFootballKeys().length) return null;

  const fdMapKey = `apisports-fd-map-${match.fixture.id}`;
  const fdMapped = getCached<number>(fdMapKey);
  if (fdMapped) return fdMapped;

  const home = match.teams.home.name;
  const away = match.teams.away.name;
  if (!home || home === "TBD" || !away || away === "TBD") return null;

  const date = match.fixture.date.slice(0, 10);
  const cacheKey = `apisports-fid-${home}-${away}-${date}`;
  const cached = getCached<number>(cacheKey);
  if (cached) {
    setCached(fdMapKey, cached, CACHE_TTL.tournament);
    return cached;
  }

  try {
    const fixtures = await loadApisportsFixturesForDate(date);
    const wc = fixtures.filter((f) => f.league?.id === 1);
    const hit = wc.find(
      (f) =>
        f.teams.home.name.toLowerCase() === home.toLowerCase() &&
        f.teams.away.name.toLowerCase() === away.toLowerCase()
    );
    if (hit) {
      setCached(cacheKey, hit.fixture.id, CACHE_TTL.tournament);
      setCached(fdMapKey, hit.fixture.id, CACHE_TTL.tournament);
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
    setCached(cacheKey, events, live ? 10_000 : CACHE_TTL.matchDetailFinished);
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
    setCached(cacheKey, statistics, CACHE_TTL.matchDetailFinished);
    return statistics;
  } catch {
    return cached ?? [];
  }
}

export async function fetchApisportsMatchExtras(
  match: Match,
  opts?: { live?: boolean; fetchEvents?: boolean; fetchStats?: boolean }
): Promise<{
  events: MatchEvent[];
  statistics: TeamMatchStatistics[];
}> {
  if (!getActiveApiFootballKeys().length) return { events: [], statistics: [] };

  const fetchEvents = opts?.fetchEvents ?? true;
  const fetchStats = opts?.fetchStats ?? true;
  if (!fetchEvents && !fetchStats) return { events: [], statistics: [] };

  const fixtureId = await resolveApisportsFixtureId(match);
  if (!fixtureId) return { events: [], statistics: [] };

  const live = opts?.live ?? false;
  const [events, statistics] = await Promise.all([
    fetchEvents ? fetchApisportsEvents(fixtureId, live) : Promise.resolve([]),
    fetchStats ? fetchApisportsStatistics(fixtureId) : Promise.resolve([]),
  ]);
  return { events, statistics };
}
