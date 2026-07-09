import { WC_LEAGUE_ID } from "./constants";
import { decidedOnPenalties, hasPenaltyScore, isPenaltyShootout } from "@/lib/utils";
import { dateWindowForTimeZone, formatDateInTimeZone, resolveTimeZone } from "./calendar";
import { serverEnv, serverEnvStatus } from "./server-env";
import { applyKnockoutWinners, pickRicherTeam, getKnockoutRoundOrder } from "./knockout-bracket";
import { getCached, getCachedStale, setCached, CACHE_TTL } from "./cache";
import type { Match, StandingGroup, MatchEvent, MatchDetail } from "./types";
import { getFallbackMatches, WC_FALLBACK_TEAMS, isFallbackDataset, type WorldCupTeam } from "./wc-fallback";
import { footballApiRequest, getApiFootballKeyCount, getActiveApiFootballKeys, getApiFootballHealth } from "./api-football-client";
import { fetchApisportsMatchExtras } from "./apisports-extras";
import {
  getFdWorldCupMatches,
  getFdWorldCupTeams,
  getFdLiveWorldCupMatches,
  getFdHeadToHead,
  getFdTeamMatches,
  getFdMatchById,
  getFdStandings,
  getFdWorldCupMatchesByDate,
  isFootballDataConfigured,
} from "./football-data-client";
import { mapFdMatch, mapFdStandings, mapFdTeam, mapFdGoalsToEvents, mapFdStatistics } from "./football-data-mapper";

export type { WorldCupTeam };

const WC_SEASON = 2026;
const TOURNAMENT_START = "2026-06-01";
const TOURNAMENT_END = "2026-07-31";

export type DashboardSource = "football-data" | "api-football" | "fallback" | "misconfigured";

function allowDevFallback(): boolean {
  return process.env.NODE_ENV !== "production" || serverEnv("ALLOW_WC_FALLBACK") === "true";
}

function isAnyFootballApiConfigured(): boolean {
  return isFootballDataConfigured() || getApiFootballKeyCount() > 0;
}

/** Ignore tiny or demo caches in production — they cause false "demo data" states. */
function tournamentCacheUsable(data: Match[] | null | undefined): data is Match[] {
  if (!data?.length) return false;
  if (isFallbackDataset(data)) return false;
  if (process.env.NODE_ENV === "production" && data.length < 50) return false;
  return true;
}

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);
const UPCOMING = new Set(["NS", "TBD"]);

export type MatchPhase = "live" | "finished" | "upcoming";

function hasScore(m: Match): boolean {
  return m.goals?.home != null || m.goals?.away != null;
}

/** Single source of truth for match state — fixes NS + score mismatches from APIs. */
export function getMatchPhase(m: Match): MatchPhase {
  const short = m.fixture.status.short;
  if (FINISHED.has(short)) return "finished";
  if (LIVE_STATUSES.has(short)) {
    // Stale live flag after shootout finished (winner set or kickoff long ago)
    const kickoff = new Date(m.fixture.date).getTime();
    const hoursPast = (Date.now() - kickoff) / 3_600_000;
    const hasWinner = m.teams.home.winner === true || m.teams.away.winner === true;
    if (short === "P" && (hasWinner || hoursPast > 2)) return "finished";
    return "live";
  }

  const kickoff = new Date(m.fixture.date).getTime();
  const hoursPast = (Date.now() - kickoff) / 3_600_000;

  if (hasScore(m) && m.goals?.home != null && m.goals?.away != null && hoursPast > 1.5) {
    return "finished";
  }

  if (hoursPast >= 0 && hoursPast < 2.5 && hasScore(m) && UPCOMING.has(short)) {
    return "live";
  }

  if (UPCOMING.has(short)) {
    const home = m.teams.home.name?.trim() || "TBD";
    const away = m.teams.away.name?.trim() || "TBD";
    if (home === "TBD" && away === "TBD") return "upcoming";
    return "upcoming";
  }

  if (hasScore(m) && hoursPast > 1.5) return "finished";
  return hoursPast >= 0 && hoursPast < 2.5 ? "live" : "upcoming";
}

function isFinishedMatch(m: Match): boolean {
  return getMatchPhase(m) === "finished";
}

function isLiveMatch(m: Match): boolean {
  return getMatchPhase(m) === "live";
}

function isUpcomingMatch(m: Match): boolean {
  return getMatchPhase(m) === "upcoming";
}

/** WC matches kicking off on a given calendar day (UTC, matches API dates). */
async function getMatchesForDate(date: string): Promise<Match[]> {
  const overlays = await fetchFreshMatchOverlays(resolveTimeZone());
  const all = mergeMatchesById(await loadWorldCupTournamentMatches(), overlays);
  let dayMatches = all.filter((m) => isScheduledOnDate(m, date));

  if (isFootballDataConfigured()) {
    try {
      const fd = await getFdWorldCupMatchesByDate(date);
      dayMatches = mergeMatchesById(dayMatches, fd.map(mapFdMatch)).filter((m) => isScheduledOnDate(m, date));
    } catch {
      /* tournament filter is enough */
    }
  }

  return dayMatches;
}

/** Re-fetch FD detail for today's matches stuck on NS after kickoff. */
async function refreshStaleTodayMatches(matches: Match[]): Promise<Match[]> {
  if (!isFootballDataConfigured()) return matches;

  const now = Date.now();
  const stale = matches.filter((m) => {
    if (isFinishedMatch(m) || isLiveMatch(m)) return false;
    const kickoff = new Date(m.fixture.date).getTime();
    return kickoff < now - 15 * 60_000;
  });

  if (!stale.length) return matches;

  const refreshed = await Promise.all(
    stale.slice(0, 4).map(async (m) => {
      try {
        const fd = await getFdMatchById(m.fixture.id);
        return fd ? mapFdMatch(fd) : m;
      } catch {
        return m;
      }
    })
  );

  return mergeMatchesById(matches, refreshed);
}

// ─── API-Football fallback (predictions + backup) ───────────────────────────

async function apisportsFetch<T>(endpoint: string, cacheKey: string, ttlMs: number): Promise<T> {
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;
  const data = await footballApiRequest<T>(endpoint);
  setCached(cacheKey, data, ttlMs);
  return data;
}

function isWorldCup(match: Match): boolean {
  return match.league.id === WC_LEAGUE_ID && match.league.season === WC_SEASON;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Server default calendar date (UTC or WC_TIMEZONE). */
function formatLocalDate(d: Date): string {
  return formatDateInTimeZone(d, resolveTimeZone());
}

function isScheduledInTimeZone(m: Match, date: string, timeZone: string): boolean {
  return formatDateInTimeZone(new Date(m.fixture.date), timeZone) === date;
}

function matchDateKey(m: Match): string {
  return m.fixture.date.slice(0, 10);
}

function isScheduledOnDate(m: Match, date: string): boolean {
  return matchDateKey(m) === date || formatLocalDate(new Date(m.fixture.date)) === date;
}

function isScheduledOnLocalDate(m: Match, date: string, timeZone?: string): boolean {
  return isScheduledInTimeZone(m, date, resolveTimeZone(timeZone));
}

function statusRank(short: string): number {
  if (FINISHED.has(short)) return 3;
  if (LIVE_STATUSES.has(short)) return 2;
  if (UPCOMING.has(short)) return 1;
  return 0;
}

function sortMatches(matches: Match[]): Match[] {
  return matches.slice().sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
}

/** Overlay fresher scores/status onto the cached tournament list. */
function mergeMatchRecords(existing: Match, overlay: Match): Match {
  const existingRank = statusRank(existing.fixture.status.short);
  const overlayRank = statusRank(overlay.fixture.status.short);

  let base = existing;
  let fresh = overlay;
  if (overlayRank < existingRank) return existing;
  if (overlayRank > existingRank) {
    base = overlay;
    fresh = existing;
  } else if (existingRank === 3 && hasScore(existing) && !hasScore(overlay)) {
    return existing;
  } else {
    base = overlay;
    fresh = existing;
  }

  const merged: Match = {
    ...base,
    teams: {
      home: pickRicherTeam(existing.teams.home, overlay.teams.home),
      away: pickRicherTeam(existing.teams.away, overlay.teams.away),
    },
    goals: {
      home: base.goals?.home ?? fresh.goals?.home ?? null,
      away: base.goals?.away ?? fresh.goals?.away ?? null,
      halfTime: base.goals?.halfTime ?? fresh.goals?.halfTime,
      extraTime: base.goals?.extraTime ?? fresh.goals?.extraTime,
      penalties: base.goals?.penalties ?? fresh.goals?.penalties,
    },
  };

  if (hasScore(overlay) && !hasScore(base)) {
    merged.goals = { ...overlay.goals, home: overlay.goals.home, away: overlay.goals.away };
  }

  return merged;
}

function mergeMatchesById(base: Match[], overlays: Match[]): Match[] {
  if (!overlays.length) return base;
  const byId = new Map(base.map((m) => [m.fixture.id, m]));
  for (const overlay of overlays) {
    const existing = byId.get(overlay.fixture.id);
    if (!existing) {
      byId.set(overlay.fixture.id, overlay);
      continue;
    }
    byId.set(overlay.fixture.id, mergeMatchRecords(existing, overlay));
  }
  return sortMatches(Array.from(byId.values()));
}

const overlayPromises = new Map<string, Promise<Match[]>>();

async function tryApisportsOverlays(timeZone: string): Promise<Match[]> {
  try {
    const live = await apisportsFetch<Match[]>(`/fixtures?live=all`, "apisports-live", CACHE_TTL.live);
    const wcLive = live.filter(isWorldCup);
    if (wcLive.length > 0) return wcLive;

    const today = formatDateInTimeZone(new Date(), timeZone);
    return await apisportsFetch<Match[]>(
      `/fixtures?date=${today}&league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
      `apisports-today-${today}-${timeZone}`,
      CACHE_TTL.today
    );
  } catch {
    return [];
  }
}

/** Pull live + local today/yesterday/tomorrow from football-data.org (deduped per request). */
async function fetchFreshMatchOverlays(timeZone: string): Promise<Match[]> {
  const tz = resolveTimeZone(timeZone);
  if (!isFootballDataConfigured()) return tryApisportsOverlays(tz);

  const existing = overlayPromises.get(tz);
  if (existing) return existing;

  const pending = (async () => {
    const dates = dateWindowForTimeZone(tz);
    const [liveFd, ...dayBatches] = await Promise.all([
      getFdLiveWorldCupMatches().catch(() => [] as Awaited<ReturnType<typeof getFdLiveWorldCupMatches>>),
      ...dates.map((date) =>
        getFdWorldCupMatchesByDate(date).catch(() => [] as Awaited<ReturnType<typeof getFdWorldCupMatchesByDate>>)
      ),
    ]);

    const byId = new Map<number, Match>();
    for (const fd of [...dayBatches.flat(), ...liveFd]) {
      byId.set(fd.id, mapFdMatch(fd));
    }

    const mapped = Array.from(byId.values());
    if (mapped.length > 0) return mapped;
    return tryApisportsOverlays(tz);
  })().finally(() => {
    overlayPromises.delete(tz);
  });

  overlayPromises.set(tz, pending);
  return pending;
}

/** Merge tournament cache with fresh overlays and refresh stale kickoffs. */
async function buildFreshTournament(timeZone?: string): Promise<Match[]> {
  const tz = resolveTimeZone(timeZone);
  const base = await loadWorldCupTournamentMatches();
  const overlays = await fetchFreshMatchOverlays(tz);
  let merged = mergeMatchesById(base, overlays);

  const today = formatDateInTimeZone(new Date(), tz);
  const todayMatches = merged.filter((m) => isScheduledInTimeZone(m, today, tz));

  // Also refresh any match that kicked off in the last 3h but still shows as not started
  const now = Date.now();
  const recentlyStarted = merged.filter((m) => {
    if (isFinishedMatch(m) || isLiveMatch(m)) return false;
    const kickoff = new Date(m.fixture.date).getTime();
    const hours = (now - kickoff) / 3_600_000;
    return hours >= 0 && hours < 3;
  });

  // Refresh knockout / recent ties still stuck on NS after kickoff (up to 48h)
  const staleKnockout = merged.filter((m) => {
    if (isFinishedMatch(m) || isLiveMatch(m)) return false;
    const kickoff = new Date(m.fixture.date).getTime();
    const hours = (now - kickoff) / 3_600_000;
    const isKo = getKnockoutRoundOrder(m.league.round ?? "") >= 0;
    return hours >= 0 && hours < (isKo ? 48 : 3);
  });

  const toRefresh = Array.from(
    new Map([...todayMatches, ...recentlyStarted, ...staleKnockout].map((m) => [m.fixture.id, m])).values()
  );
  const refreshed = await refreshStaleTodayMatches(toRefresh);
  merged = mergeMatchesById(merged, refreshed);

  merged = applyKnockoutWinners(merged);

  return merged;
}

async function loadApisportsTournament(): Promise<Match[]> {
  try {
    const matches = await apisportsFetch<Match[]>(
      `/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
      `apisports-wc-${WC_SEASON}`,
      CACHE_TTL.tournament
    );
    return matches.filter(isWorldCup);
  } catch {
    return [];
  }
}

// ─── Primary loaders (football-data.org first) ────────────────────────────

let tournamentPromise: Promise<Match[]> | null = null;
/** In-memory backup so rate limits never wipe the full 104-match dataset. */
let lastKnownTournament: Match[] | null = null;

export async function loadWorldCupTournamentMatches(): Promise<Match[]> {
  const cacheKey = `wc-tournament-${TOURNAMENT_START}-${TOURNAMENT_END}`;
  const cached = getCached<Match[]>(cacheKey);
  if (tournamentCacheUsable(cached)) return applyKnockoutWinners(cached);

  if (!tournamentPromise) {
    tournamentPromise = (async () => {
      if (!isFootballDataConfigured() && getApiFootballKeyCount() === 0) {
        if (lastKnownTournament?.length) return lastKnownTournament;
        if (allowDevFallback()) {
          const fallback = getFallbackMatches();
          if (allowDevFallback()) setCached(cacheKey, fallback, CACHE_TTL.tournament);
          return fallback;
        }
        console.warn("[football] No API keys configured — returning empty tournament in production");
        return [];
      }

      if (isFootballDataConfigured()) {
        try {
          const fd = await getFdWorldCupMatches();
          let mapped = fd.map(mapFdMatch).sort(
            (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
          );
          if (mapped.length > 0) {
            mapped = applyKnockoutWinners(mapped);
            if (mapped.length >= 50) lastKnownTournament = mapped;
            setCached(cacheKey, mapped, CACHE_TTL.tournament);
            return mapped;
          }
        } catch (e) {
          const msg = (e as Error).message;
          console.warn("[football-data] tournament load failed:", msg);
          const stale = getCachedStale<Match[]>(cacheKey);
          if (tournamentCacheUsable(stale)) return stale;
          if (lastKnownTournament?.length) return lastKnownTournament;
        }
      }

      if (lastKnownTournament?.length) return lastKnownTournament;

      try {
        const apisports = await loadApisportsTournament();
        if (apisports.length > 0) {
          apisports.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
          if (apisports.length >= 50) lastKnownTournament = apisports;
          setCached(cacheKey, apisports, CACHE_TTL.tournament);
          return apisports;
        }
      } catch {
        /* fall through */
      }

      if (lastKnownTournament?.length) return lastKnownTournament;

      if (!allowDevFallback()) {
        console.warn("[football] Tournament APIs failed — fallback disabled in production");
        return [];
      }

      const fallback = getFallbackMatches();
      setCached(cacheKey, fallback, CACHE_TTL.tournament);
      return fallback;
    })().finally(() => {
      tournamentPromise = null;
    });
  }

  return tournamentPromise;
}

export async function getWorldCupTeamsRegistry(): Promise<WorldCupTeam[]> {
  const cacheKey = "wc-team-registry";
  const cached = getCached<WorldCupTeam[]>(cacheKey);
  if (cached) return cached;

  if (isFootballDataConfigured()) {
    try {
      const teams = await getFdWorldCupTeams();
      if (teams.length > 0) {
        const mapped = teams.map(mapFdTeam).sort((a, b) => a.name.localeCompare(b.name));
        setCached(cacheKey, mapped, CACHE_TTL.tournament);
        return mapped;
      }
    } catch {
      /* fall through */
    }
  }

  const matches = await loadWorldCupTournamentMatches();
  const byId = new Map<number, WorldCupTeam>();
  for (const m of matches) {
    byId.set(m.teams.home.id, m.teams.home);
    byId.set(m.teams.away.id, m.teams.away);
  }
  const result = byId.size > 0 ? Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)) : WC_FALLBACK_TEAMS;
  setCached(cacheKey, result, CACHE_TTL.tournament);
  return result;
}

export async function findTeamInRegistry(query: string): Promise<WorldCupTeam | null> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;
  const teams = await getWorldCupTeamsRegistry();
  return (
    teams.find((t) => t.name.toLowerCase() === q) ??
    teams.find((t) => t.name.toLowerCase().startsWith(q)) ??
    teams.find((t) => t.name.toLowerCase().includes(q)) ??
    null
  );
}

export async function loadWorldCupMatches(): Promise<Match[]> {
  return loadWorldCupTournamentMatches();
}

export async function getLiveMatches(): Promise<Match[]> {
  const tournament = await buildFreshTournament();
  const live = tournament.filter(isLiveMatch);
  if (live.length > 0) return live;

  const apisports = await tryApisportsOverlays(resolveTimeZone());
  return apisports.filter(isLiveMatch);
}

export async function getFixtures(): Promise<Match[]> {
  const today = formatLocalDate(new Date());
  const tournament = await buildFreshTournament();
  const liveIds = new Set(tournament.filter(isLiveMatch).map((m) => m.fixture.id));
  return sortMatches(
    tournament.filter((m) => isScheduledOnLocalDate(m, today) && isUpcomingMatch(m) && !liveIds.has(m.fixture.id))
  );
}

export async function getTodaysWorldCupSchedule() {
  const today = formatLocalDate(new Date());
  const allToday = await buildFreshTournament().then((t) => t.filter((m) => isScheduledOnLocalDate(m, today)));
  return {
    date: today,
    live: allToday.filter((m) => getMatchPhase(m) === "live"),
    finished: allToday.filter((m) => getMatchPhase(m) === "finished"),
    upcoming: allToday.filter((m) => getMatchPhase(m) === "upcoming"),
  };
}

export async function getRecentResults(last = 50): Promise<Match[]> {
  const all = await buildFreshTournament();
  return all.filter((m) => getMatchPhase(m) === "finished").reverse().slice(0, last);
}

/** Most recent finished World Cup match for a team. */
export async function getLatestFinishedMatchForTeam(teamId: number): Promise<Match | null> {
  const results = await getRecentResults(100);
  return results.find((m) => m.teams.home.id === teamId || m.teams.away.id === teamId) ?? null;
}

export async function getAllWorldCupMatches(): Promise<Match[]> {
  return loadWorldCupTournamentMatches();
}

export async function getStandings(): Promise<StandingGroup[]> {
  if (isFootballDataConfigured()) {
    try {
      const data = await getFdStandings();
      const mapped = mapFdStandings(data);
      if (mapped.length > 0) return mapped;
    } catch {
      /* fall through */
    }
  }

  const matches = await loadWorldCupTournamentMatches();
  const finished = matches.filter((m) => FINISHED.has(m.fixture.status.short));
  const byRound = new Map<string, Match[]>();
  for (const m of finished) {
    const round = m.league.round ?? "Completed Matches";
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push(m);
  }

  const groups: StandingGroup[] = [];
  for (const [round, roundMatches] of Array.from(byRound.entries())) {
    groups.push({
      group: round,
      table: roundMatches.map((m, i) => ({
        rank: i + 1,
        team: m.teams.home.winner ? m.teams.home : m.teams.away,
        points: 0,
        all: { played: 1, win: 1, draw: 0, lose: 0 },
        goalsDiff: (m.goals.home ?? 0) - (m.goals.away ?? 0),
        form: `${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`,
      })),
    });
  }

  return groups.length ? groups.reverse() : [{
    group: "Tournament",
    table: [{ rank: 1, team: { id: 0, name: "No standings yet", logo: "" }, points: 0, all: { played: 0, win: 0, draw: 0, lose: 0 }, goalsDiff: 0, form: null }],
  }];
}

export async function getUpcomingWorldCupMatches(limit = 12): Promise<Match[]> {
  const tournament = await buildFreshTournament();
  const now = Date.now();
  return sortMatches(
    tournament.filter(
      (m) => getMatchPhase(m) === "upcoming" && new Date(m.fixture.date).getTime() >= now - 60_000
    )
  ).slice(0, limit);
}

export async function getDashboardData(opts?: { timeZone?: string }) {
  const timeZone = resolveTimeZone(opts?.timeZone);
  const tournament = await buildFreshTournament(timeZone);
  const today = formatDateInTimeZone(new Date(), timeZone);
  const configured = isAnyFootballApiConfigured();

  const live = sortMatches(tournament.filter((m) => getMatchPhase(m) === "live"));
  const liveIds = new Set(live.map((m) => m.fixture.id));
  const fixtures = sortMatches(
    tournament.filter(
      (m) =>
        isScheduledInTimeZone(m, today, timeZone) &&
        getMatchPhase(m) === "upcoming" &&
        !liveIds.has(m.fixture.id)
    )
  );
  const upcoming = sortMatches(
    tournament.filter((m) => getMatchPhase(m) === "upcoming" && new Date(m.fixture.date).getTime() >= Date.now() - 60_000)
  );

  const results = tournament.filter((m) => getMatchPhase(m) === "finished").reverse();
  const [standings, teams] = await Promise.all([getStandings(), getWorldCupTeamsRegistry()]);

  let source: DashboardSource = isFootballDataConfigured() ? "football-data" : "api-football";
  let warning: string | undefined;

  const envStatus = serverEnvStatus();

  if (!configured) {
    source = "misconfigured";
    warning =
      "Football data API is not configured. In Vercel → Settings → Environment Variables, add FOOTBALL_DATA_KEY (exact name, no quotes), enable Production, then Redeploy.";
  } else if (isFallbackDataset(tournament)) {
    source = "fallback";
    warning =
      "Showing offline demo matches — football-data.org did not respond on the server. Confirm FOOTBALL_DATA_KEY in Vercel and redeploy.";
  } else if (tournament.length > 0 && tournament.length < 50) {
    warning = `Only ${tournament.length} of 104 World Cup matches loaded — API may be rate-limited. Try again in a minute.`;
  } else if (tournament.length === 0) {
    warning = "Could not load World Cup schedule. Check API keys or rate limits.";
  }

  return {
    live,
    fixtures,
    upcoming,
    results,
    standings,
    teams,
    total: tournament.length,
    source,
    configured,
    warning,
    envStatus,
    updatedAt: new Date().toISOString(),
    scheduleDate: today,
    timeZone,
  };
}

export async function getMatchById(id: number): Promise<Match | null> {
  const cached = (await loadWorldCupTournamentMatches()).find((m) => m.fixture.id === id);
  if (cached) return cached;

  if (isFootballDataConfigured()) {
    const fd = await getFdMatchById(id);
    if (fd) return mapFdMatch(fd);
  }

  try {
    const matches = await apisportsFetch<Match[]>(`/fixtures?id=${id}`, `match-${id}`, CACHE_TTL.matchDetail);
    return matches[0] ?? null;
  } catch {
    return null;
  }
}

function normalizeMatch(match: Match): Match {
  return {
    ...match,
    goals: {
      home: match.goals?.home ?? null,
      away: match.goals?.away ?? null,
      halfTime: match.goals?.halfTime,
      extraTime: match.goals?.extraTime,
      penalties: match.goals?.penalties,
    },
  };
}

function mergeEvents(primary: MatchEvent[], extra: MatchEvent[]): MatchEvent[] {
  if (!extra.length) return primary;
  const seen = new Set(
    primary.map((e) => `${e.time.elapsed}-${e.team.name}-${e.player.name}-${e.type}-${e.detail}`)
  );
  const merged = [...primary];
  for (const e of extra) {
    const key = `${e.time.elapsed}-${e.team.name}-${e.player.name}-${e.type}-${e.detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(e);
    }
  }
  return merged.sort((a, b) => a.time.elapsed - b.time.elapsed);
}

export async function getMatchDetail(id: number): Promise<MatchDetail | null> {
  let match: Match | null = (await loadWorldCupTournamentMatches()).find((m) => m.fixture.id === id) ?? null;
  const prelimStatus = match?.fixture.status.short ?? "";
  const livePhase =
    LIVE_STATUSES.has(prelimStatus) ||
    prelimStatus === "P" ||
    ["LIVE", "HT", "ET", "1H", "2H"].includes(prelimStatus);
  const finished = FINISHED.has(prelimStatus);

  const detailCacheKey = `match-detail-v2-${id}`;
  if (!livePhase) {
    const cachedDetail = getCached<MatchDetail>(detailCacheKey);
    if (cachedDetail) return cachedDetail;
  }

  let fdRaw = null;
  if (isFootballDataConfigured()) {
    fdRaw = await getFdMatchById(id, finished);
    if (fdRaw) match = mapFdMatch(fdRaw);
  }

  if (!match) {
    match = await getMatchById(id);
  }
  if (!match) return null;

  let events: MatchEvent[] = fdRaw ? mapFdGoalsToEvents(fdRaw) : [];
  let statistics = fdRaw ? mapFdStatistics(fdRaw) : [];
  let source: MatchDetail["source"] = "football-data";

  const apiAvailable = getActiveApiFootballKeys().length > 0;

  const needsApiEvents = apiAvailable && events.length === 0;
  const needsApiStats = apiAvailable && statistics.length === 0;
  const needsLiveRefresh = apiAvailable && livePhase;

  if (needsApiEvents || needsApiStats || needsLiveRefresh) {
    const extras = await fetchApisportsMatchExtras(match, {
      live: livePhase,
      fetchEvents: needsApiEvents || needsLiveRefresh,
      fetchStats: needsApiStats,
    });
    if (extras.events.length) {
      events = mergeEvents(events, extras.events);
      source = statistics.length && fdRaw ? "mixed" : events.length ? "api-football" : source;
    }
    if (extras.statistics.length) {
      statistics = extras.statistics;
      source = events.length ? "mixed" : "api-football";
    }
  }

  const referee = fdRaw?.referees?.[0]?.name ?? null;

  let extrasNote: string | undefined;
  if (events.length === 0 || statistics.length === 0) {
    if (!getApiFootballKeyCount()) {
      extrasNote =
        "football-data.org provides scores only for World Cup 2026 — add API_FOOTBALL_KEY for goal events and team statistics.";
    } else if (!apiAvailable) {
      const health = await getApiFootballHealth();
      extrasNote = health.message;
    } else if (statistics.length === 0 && events.length === 0) {
      extrasNote = "Could not load events or statistics for this match from API-Football.";
    } else if (statistics.length === 0) {
      extrasNote = "Team statistics were not returned for this fixture.";
    } else if (events.length === 0) {
      extrasNote = "Goal scorers and cards were not returned for this fixture.";
    }
  }

  const detail: MatchDetail = {
    match: normalizeMatch(match),
    events,
    statistics,
    referee,
    source,
    statsAvailable: events.length > 0 || statistics.length > 0,
    extrasNote,
  };

  const ttl = livePhase ? CACHE_TTL.live : finished ? CACHE_TTL.matchDetailFinished : CACHE_TTL.matchDetail;
  setCached(detailCacheKey, detail, ttl);
  return detail;
}

export async function getMatchEvents(id: number): Promise<MatchEvent[]> {
  const detail = await getMatchDetail(id);
  return detail?.events ?? [];
}

export async function getMatchStats(id: number) {
  try {
    return await apisportsFetch<unknown[]>(`/fixtures/statistics?fixture=${id}`, `stats-${id}`, CACHE_TTL.matchDetail);
  } catch {
    return [];
  }
}

function findMatchBetweenTeams(all: Match[], team1Id: number, team2Id: number): Match | null {
  return (
    all.find(
      (m) =>
        (m.teams.home.id === team1Id && m.teams.away.id === team2Id) ||
        (m.teams.home.id === team2Id && m.teams.away.id === team1Id)
    ) ?? null
  );
}

export async function getHeadToHead(team1: number, team2: number): Promise<Match[]> {
  const tournament = await loadWorldCupTournamentMatches();
  const fixture = findMatchBetweenTeams(tournament, team1, team2);

  if (fixture && isFootballDataConfigured()) {
    try {
      const h2h = await getFdHeadToHead(fixture.fixture.id);
      const mapped = h2h.map(mapFdMatch);
      if (mapped.length > 0) return mapped;
    } catch {
      /* fall through */
    }
  }

  const direct = tournament.filter(
    (m) =>
      FINISHED.has(m.fixture.status.short) &&
      ((m.teams.home.id === team1 && m.teams.away.id === team2) ||
        (m.teams.home.id === team2 && m.teams.away.id === team1))
  );
  if (direct.length > 0) return direct;

  try {
    return await apisportsFetch<Match[]>(
      `/fixtures/headtohead?h2h=${team1}-${team2}`,
      `h2h-${team1}-${team2}`,
      CACHE_TTL.h2h
    );
  } catch {
    return fixture ? [fixture] : [];
  }
}

export async function getTeamWorldCupResults(teamId: number, max = 5): Promise<Match[]> {
  if (isFootballDataConfigured()) {
    try {
      const matches = await getFdTeamMatches(teamId, "FINISHED");
      return matches.map(mapFdMatch).reverse().slice(0, max);
    } catch {
      /* fall through */
    }
  }

  const all = await loadWorldCupTournamentMatches();
  return all
    .filter((m) => (m.teams.home.id === teamId || m.teams.away.id === teamId) && FINISHED.has(m.fixture.status.short))
    .reverse()
    .slice(0, max);
}

// ─── Predictions (API-Football only — football-data has no prediction API) ─

export interface FixturePrediction {
  fixtureId: number;
  home: { id: number; name: string };
  away: { id: number; name: string };
  round: string;
  date: string;
  winner: { name: string; comment: string };
  percent: { home: string; draw: string; away: string };
  advice: string;
  underOver: string | null;
  comparison: Record<string, { home: string; away: string }>;
  homeTeam: TeamFormSnapshot;
  awayTeam: TeamFormSnapshot;
  h2hMatches: Match[];
}

export interface TeamFormSnapshot {
  id: number;
  name: string;
  formString: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsForAvg: string;
  goalsAgainstAvg: string;
  formRating: string;
  attRating: string;
  defRating: string;
  formation: string | null;
  recentMatches: string[];
}

function buildFormSnapshot(teamId: number, name: string, results: Match[]): TeamFormSnapshot {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const formLetters: string[] = [];

  for (const m of results) {
    const isHome = m.teams.home.id === teamId;
    const gf = isHome ? m.goals.home! : m.goals.away!;
    const ga = isHome ? m.goals.away! : m.goals.home!;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) { wins++; formLetters.push("W"); }
    else if (gf < ga) { losses++; formLetters.push("L"); }
    else { draws++; formLetters.push("D"); }
  }

  const played = results.length;
  const formString = formLetters.join("");

  return {
    id: teamId,
    name,
    formString: formString || null,
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalsForAvg: played ? (goalsFor / played).toFixed(1) : "-",
    goalsAgainstAvg: played ? (goalsAgainst / played).toFixed(1) : "-",
    formRating: played ? `${Math.round((wins / played) * 100)}%` : "-",
    attRating: "-",
    defRating: "-",
    formation: null,
    recentMatches: results.map((m) => {
      const isHome = m.teams.home.id === teamId;
      const gf = isHome ? m.goals.home : m.goals.away;
      const ga = isHome ? m.goals.away : m.goals.home;
      const r = gf! > ga! ? "W" : gf! < ga! ? "L" : "D";
      return `${new Date(m.fixture.date).toLocaleDateString()} · ${r} · ${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`;
    }),
  };
}

function estimateWinChances(home: TeamFormSnapshot, away: TeamFormSnapshot): { home: string; draw: string; away: string } {
  const homePts = home.wins * 3 + home.draws;
  const awayPts = away.wins * 3 + away.draws;
  const total = Math.max(homePts + awayPts + 3, 1);
  const homePct = Math.round(((homePts + 1.5) / (homePts + awayPts + 3)) * 70 + 15);
  const awayPct = Math.round(((awayPts + 1.5) / (homePts + awayPts + 3)) * 70 + 10);
  const drawPct = Math.max(100 - homePct - awayPct, 12);
  return { home: `${homePct}%`, draw: `${drawPct}%`, away: `${awayPct}%` };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApisportsTeamForm(team: any, recentMatches: string[]): TeamFormSnapshot {
  const last5 = team?.last_5 ?? {};
  const league = team?.league ?? {};
  const fixtures = league?.fixtures ?? {};
  const goals = league?.goals ?? {};
  return {
    id: team.id,
    name: team.name,
    formString: league.form ?? null,
    played: fixtures?.played?.total ?? last5.played ?? 0,
    wins: fixtures?.wins?.total ?? 0,
    draws: fixtures?.draws?.total ?? 0,
    losses: fixtures?.loses?.total ?? 0,
    goalsFor: goals?.for?.total?.total ?? last5.goals?.for?.total ?? 0,
    goalsAgainst: goals?.against?.total?.total ?? last5.goals?.against?.total ?? 0,
    goalsForAvg: goals?.for?.average?.total ?? last5.goals?.for?.average ?? "-",
    goalsAgainstAvg: goals?.against?.average?.total ?? last5.goals?.against?.average ?? "-",
    formRating: last5.form ?? "-",
    attRating: last5.att ?? "-",
    defRating: last5.def ?? "-",
    formation: league?.lineups?.[0]?.formation ?? null,
    recentMatches,
  };
}

async function findApisportsFixtureId(homeName: string, awayName: string): Promise<number | null> {
  try {
    const today = formatDate(new Date());
    const day = await apisportsFetch<Match[]>(`/fixtures?date=${today}`, `apisports-today-${today}`, CACHE_TTL.fixtures);
    const hit = day.find(
      (m) =>
        m.teams.home.name.toLowerCase() === homeName.toLowerCase() &&
        m.teams.away.name.toLowerCase() === awayName.toLowerCase()
    );
    return hit?.fixture.id ?? null;
  } catch {
    return null;
  }
}

export async function getFixturePrediction(fixtureId: number): Promise<FixturePrediction | null> {
  const match = await getMatchById(fixtureId);
  if (!match) return null;

  const homeId = match.teams.home.id;
  const awayId = match.teams.away.id;
  const [homeRecent, awayRecent] = await Promise.all([
    getTeamWorldCupResults(homeId, 5),
    getTeamWorldCupResults(awayId, 5),
  ]);

  const apisportsId = await findApisportsFixtureId(match.teams.home.name, match.teams.away.name);
  if (apisportsId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await apisportsFetch<any[]>(`/predictions?fixture=${apisportsId}`, `predictions-${apisportsId}`, CACHE_TTL.predictions);
      const row = rows[0];
      if (row?.predictions) {
        return {
          fixtureId,
          home: { id: homeId, name: match.teams.home.name },
          away: { id: awayId, name: match.teams.away.name },
          round: match.league.round ?? "",
          date: match.fixture.date,
          winner: { name: row.predictions.winner?.name ?? "", comment: row.predictions.winner?.comment ?? "" },
          percent: row.predictions.percent ?? { home: "-", draw: "-", away: "-" },
          advice: row.predictions.advice ?? "",
          underOver: row.predictions.under_over ?? null,
          comparison: row.comparison ?? {},
          homeTeam: mapApisportsTeamForm(row.teams.home, homeRecent.map((m) => formatTeamResultLine(m, homeId))),
          awayTeam: mapApisportsTeamForm(row.teams.away, awayRecent.map((m) => formatTeamResultLine(m, awayId))),
          h2hMatches: (row.h2h as Match[]) ?? [],
        };
      }
    } catch {
      /* use form-based estimate */
    }
  }

  const homeTeam = buildFormSnapshot(homeId, match.teams.home.name, homeRecent);
  const awayTeam = buildFormSnapshot(awayId, match.teams.away.name, awayRecent);
  const percent = estimateWinChances(homeTeam, awayTeam);
  const leader = parseInt(percent.home) >= parseInt(percent.away) ? match.teams.home.name : match.teams.away.name;

  return {
    fixtureId,
    home: { id: homeId, name: match.teams.home.name },
    away: { id: awayId, name: match.teams.away.name },
    round: match.league.round ?? "",
    date: match.fixture.date,
    winner: { name: leader, comment: "Based on World Cup form" },
    percent,
    advice: `Form-based estimate — ${leader} slight edge`,
    underOver: null,
    comparison: {
      form: { home: percent.home, away: percent.away },
      total: { home: percent.home, away: percent.away },
    },
    homeTeam,
    awayTeam,
    h2hMatches: await getHeadToHead(homeId, awayId),
  };
}

function formatTeamResultLine(m: Match, teamId: number): string {
  const isHome = m.teams.home.id === teamId;
  const gf = isHome ? m.goals.home! : m.goals.away!;
  const ga = isHome ? m.goals.away! : m.goals.home!;
  const result = gf > ga ? "W" : gf < ga ? "L" : "D";
  return `${new Date(m.fixture.date).toLocaleDateString()} · ${result} · ${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`;
}

export function formatMatchesForLLM(matches: Match[]): string {
  return matches
    .map((m) => {
      const phase = getMatchPhase(m);
      const round = m.league.round ?? "";
      if (phase === "upcoming") {
        const kickoff = new Date(m.fixture.date).toISOString();
        return `${m.teams.home.name} vs ${m.teams.away.name} | Scheduled ${kickoff} | ${round}`;
      }
      return `${m.teams.home.name} ${m.goals.home ?? "-"} vs ${m.goals.away ?? "-"} ${m.teams.away.name} | ${m.fixture.status.long} | ${round}`;
    })
    .join("\n");
}
