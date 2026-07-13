import { findTeamInRegistry, getHeadToHead, getWorldCupTeamsRegistry, loadWorldCupTournamentMatches, getTodaysWorldCupSchedule } from "./football-api";
import { footballApiRequest } from "./api-football-client";
import type { Match } from "./types";

export interface TeamResult {
  id: number;
  name: string;
  logo: string;
}

const SPLIT_PATTERNS = [
  /(?:stats?|statistics)\s+(?:of|for|between)\s+(.+?)\s+(?:and|&)\s+(.+?)\??$/i,
  /(.+?)\s+(?:against|versus|vs\.?|v)\s+(.+?)\??$/i,
  /(?:between|of)\s+(.+?)\s+(?:and|&)\s+(.+?)\??$/i,
  /(.+?)\s+(?:and|&)\s+(.+?)\??$/i,
];

/** Pull two team names from natural language — supports against, possessives, etc. */
export function extractTeamPair(message: string): [string, string] | null {
  let text = message.trim();

  for (const pattern of SPLIT_PATTERNS) {
    const split = text.match(pattern);
    if (!split) continue;

    let a = cleanTeamToken(split[1]);
    let b = cleanTeamToken(split[2]);

    a = stripPreamble(a);
    b = stripPreamble(b);

    if (a.length >= 2 && b.length >= 2) return [a, b];
  }

  return null;
}

function stripPreamble(s: string): string {
  return s
    .replace(/^.*?(?:head[\s-]?to[\s-]?head|h2h)\s*(?:stats?|statistics|record)?\s*(?:of|between|for)?\s*/i, "")
    .replace(/^(?:what|who|tell me|show|give|can you)\s+(?:is|are|me|you)?\s*/i, "")
    .replace(/^(?:the\s+)?(?:preview|analysis|stats?|statistics|record)\s+(?:of|for|on)?\s*/i, "")
    .replace(/^(?:the\s+)?/i, "")
    .trim();
}

function cleanTeamToken(s: string): string {
  return s
    .replace(/'s\b/g, "")
    .replace(/\b(?:match|game|fixture|preview|analysis|stats?|statistics|history|record|h2h|chances?|odds|probability)\b/gi, "")
    .replace(/\s+(?:in|at|on|for|during|this|the|world cup|wc)\b.*$/gi, "")
    .replace(/[?.!,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull a single team name from casual chat ("so egypt lost", "win chances of switzerland"). */
export async function findTeamMentionedInMessage(message: string): Promise<TeamResult | null> {
  const teams = await getWorldCupTeamsRegistry();
  const lower = message.toLowerCase();
  const sorted = [...teams].sort((a, b) => b.name.length - a.name.length);
  for (const team of sorted) {
    if (lower.includes(team.name.toLowerCase())) return team;
  }

  const possessive = message.match(/\b([a-z][a-z\s-]+?)'s\b/i);
  if (possessive) {
    const hit = await searchTeam(cleanTeamToken(possessive[1]));
    if (hit) return hit;
  }

  const ofMatch = message.match(
    /(?:chances?|probability|probabilities|odds|preview|analysis|stats?)\s+(?:of|for)\s+(.+?)\??$/i
  );
  if (ofMatch) {
    const hit = await searchTeam(cleanTeamToken(ofMatch[1]));
    if (hit) return hit;
  }

  return null;
}

/** Next live or upcoming World Cup opponent for a team. */
async function findNextOpponent(team: TeamResult): Promise<TeamResult | null> {
  const { live, upcoming } = await getTodaysWorldCupSchedule();
  for (const m of [...live, ...upcoming]) {
    if (m.teams.home.id === team.id) {
      const away = m.teams.away;
      if (away.name && away.name !== "TBD") return { id: away.id, name: away.name, logo: away.logo };
    }
    if (m.teams.away.id === team.id) {
      const home = m.teams.home;
      if (home.name && home.name !== "TBD") return { id: home.id, name: home.name, logo: home.logo };
    }
  }

  const finished = new Set(["FT", "AET", "PEN"]);
  const all = await loadWorldCupTournamentMatches();
  const next = all
    .filter(
      (m) =>
        (m.teams.home.id === team.id || m.teams.away.id === team.id) && !finished.has(m.fixture.status.short)
    )
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0];

  if (!next) return null;
  const opp = next.teams.home.id === team.id ? next.teams.away : next.teams.home;
  if (!opp.name || opp.name === "TBD") return null;
  return { id: opp.id, name: opp.name, logo: opp.logo };
}

/** Resolve one team + their next opponent (e.g. "win chances of Switzerland"). */
async function resolveTeamWithNextOpponent(message: string): Promise<[TeamResult, TeamResult] | null> {
  const team = await findTeamMentionedInMessage(message);
  if (!team) return null;
  const opponent = await findNextOpponent(team);
  if (!opponent) return null;
  return [team, opponent];
}

/** Find two World Cup teams mentioned anywhere in the message. */
export async function findTeamsInMessage(message: string): Promise<[TeamResult, TeamResult] | null> {
  const teams = await getWorldCupTeamsRegistry();
  const lower = message.toLowerCase();
  const found: TeamResult[] = [];

  // Longest names first so "United States" matches before shorter substrings
  const sorted = [...teams].sort((a, b) => b.name.length - a.name.length);
  for (const team of sorted) {
    const name = team.name.toLowerCase();
    if (lower.includes(name) && !found.some((t) => t.id === team.id)) {
      found.push(team);
      if (found.length === 2) return [found[0], found[1]];
    }
  }

  return found.length === 2 ? [found[0], found[1]] : null;
}

/** Resolve two teams from any phrasing — pair extraction, registry scan, or single team + next opponent. */
export async function resolveTeamsFromMessage(message: string): Promise<[TeamResult, TeamResult] | null> {
  const pair = extractTeamPair(message);
  if (pair) {
    const [team1, team2] = await Promise.all([searchTeam(pair[0]), searchTeam(pair[1])]);
    if (team1 && team2) return [team1, team2];
  }

  const two = await findTeamsInMessage(message);
  if (two) return two;

  return resolveTeamWithNextOpponent(message);
}

export async function searchTeam(query: string): Promise<TeamResult | null> {
  const fromRegistry = await findTeamInRegistry(query);
  if (fromRegistry) return fromRegistry;

  try {
    const teams = await footballApiRequest<{ team: TeamResult }[]>(
      `/teams?search=${encodeURIComponent(query)}`
    );
    if (!teams?.length) return null;

    const q = query.toLowerCase();
    const exact = teams.find((t) => t.team.name.toLowerCase() === q);
    if (exact) return exact.team;

    const starts = teams.find((t) => t.team.name.toLowerCase().startsWith(q));
    if (starts) return starts.team;

    return teams[0].team;
  } catch {
    return null;
  }
}

/** Free H2H: meetings + scheduled fixture only. Form / win % stay premium. */
export async function resolveHeadToHead(message: string): Promise<{
  team1: TeamResult;
  team2: TeamResult;
  matches: Match[];
  summary: string;
} | null> {
  const resolved = await resolveTeamsFromMessage(message);
  if (!resolved) return null;

  const [team1, team2] = resolved;
  const matches = await getHeadToHead(team1.id, team2.id);

  const played = matches.filter((m) => m.goals.home !== null && m.goals.away !== null);
  const upcoming = matches.filter((m) => m.goals.home === null && m.goals.away === null);

  let t1Wins = 0;
  let t2Wins = 0;
  let draws = 0;

  for (const m of played) {
    const h = m.goals.home!;
    const a = m.goals.away!;
    const t1IsHome = m.teams.home.id === team1.id;
    if (h === a) draws++;
    else if (h > a) t1IsHome ? t1Wins++ : t2Wins++;
    else t1IsHome ? t2Wins++ : t1Wins++;
  }

  const lines = matches.map((m) => {
    const score =
      m.goals.home !== null ? `${m.goals.home}-${m.goals.away}` : "not played yet";
    return `- ${new Date(m.fixture.date).toLocaleDateString()}: ${m.teams.home.name} ${score} ${m.teams.away.name} (${m.fixture.status.long})${m.league?.round ? ` — ${m.league.round}` : ""}`;
  });

  const summary = [
    `HEAD-TO-HEAD: ${team1.name} vs ${team2.name}`,
    `Meetings in API: ${matches.length}`,
    played.length
      ? `Record: ${team1.name} ${t1Wins}W, ${team2.name} ${t2Wins}W, ${draws}D (${played.length} finished)`
      : upcoming.length
        ? `No finished meetings yet — ${upcoming.length} scheduled in this World Cup.`
        : "No finished meetings in the current data feed.",
    upcoming.length
      ? `Next: ${upcoming.map((m) => `${m.league.round ?? "World Cup"} · ${new Date(m.fixture.date).toLocaleString()} · ${m.teams.home.name} vs ${m.teams.away.name}`).join("; ")}`
      : "",
    "Matches:",
    ...(lines.length ? lines : ["- No meetings found in API"]),
  ]
    .filter(Boolean)
    .join("\n");

  return { team1, team2, matches, summary };
}
