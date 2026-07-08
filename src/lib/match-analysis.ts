import {
  getFixturePrediction,
  getHeadToHead,
  getTeamWorldCupResults,
  getUpcomingWorldCupMatches,
  loadWorldCupTournamentMatches,
  type FixturePrediction,
} from "./football-api";
import { ninjaGreeting } from "./copilot-personality";
import { getFallbackPrediction, findFallbackFixture } from "./prediction-fallback";
import { resolveTeamsFromMessage, searchTeam } from "./team-resolver";
import { getKnockoutRoundOrder, getKnockoutWinner, isTbdTeamName } from "./knockout-bracket";
import type { Match, Team } from "./types";

const FINISHED = new Set(["FT", "AET", "PEN"]);

export interface PremiumMatchReport {
  team1: { id: number; name: string };
  team2: { id: number; name: string };
  fixtureId: number | null;
  report: string;
  prediction: FixturePrediction | null;
}

function findUpcomingFixture(
  team1Id: number,
  team2Id: number,
  h2h: Match[],
  window: Match[]
): Match | null {
  const candidates = [...h2h, ...window].filter(
    (m) =>
      (m.teams.home.id === team1Id && m.teams.away.id === team2Id) ||
      (m.teams.home.id === team2Id && m.teams.away.id === team1Id)
  );
  const upcoming = candidates.find((m) => !FINISHED.has(m.fixture.status.short));
  return upcoming ?? candidates[0] ?? null;
}

function formatTeamSection(label: string, team: FixturePrediction["homeTeam"]): string {
  const lines = [
    `### ${label}`,
    `**Tournament form:** ${team.formString ? team.formString.split("").join(" ") : "N/A"} (${team.formRating} form rating)`,
    `**Record:** ${team.wins}W · ${team.draws}D · ${team.losses}L (${team.played} played in World Cup)`,
    `**Goals:** ${team.goalsFor} scored (${team.goalsForAvg}/game) · ${team.goalsAgainst} conceded (${team.goalsAgainstAvg}/game)`,
    `**Ratings:** Attack ${team.attRating} · Defence ${team.defRating}${team.formation ? ` · ${team.formation}` : ""}`,
  ];

  if (team.recentMatches.length > 0) {
    lines.push("**Recent World Cup results:**");
    team.recentMatches.forEach((m) => lines.push(`- ${m}`));
  } else if (team.formString) {
    lines.push(`**Form sequence (API):** ${team.formString.split("").map((c) => (c === "W" ? "Win" : c === "D" ? "Draw" : "Loss")).join(", ")}`);
  }

  return lines.join("\n");
}

function formatComparison(pred: FixturePrediction): string {
  const metrics = [
    ["Form", "form"],
    ["Attack", "att"],
    ["Defence", "def"],
    ["Poisson model", "poisson_distribution"],
    ["Overall edge", "total"],
  ] as const;

  const rows = metrics
    .map(([label, key]) => {
      const row = pred.comparison[key];
      if (!row) return null;
      return `| ${label} | ${row.home} | ${row.away} |`;
    })
    .filter(Boolean);

  if (!rows.length) return "";
  return ["| Metric | " + pred.home.name + " | " + pred.away.name + " |", "|---|---|---|", ...rows].join("\n");
}

function buildReportFromPrediction(
  team1: { id: number; name: string },
  team2: { id: number; name: string },
  fixture: Match | null,
  pred: FixturePrediction,
  h2h: Match[]
): string {
  const played = h2h.filter((m) => m.goals.home !== null);
  const homeName = pred.home.name;
  const awayName = pred.away.name;

  const homeIsTeam1 = homeName.toLowerCase() === team1.name.toLowerCase();
  const team1Win = homeIsTeam1 ? pred.percent.home : pred.percent.away;
  const team2Win = homeIsTeam1 ? pred.percent.away : pred.percent.home;

  const lines = [
    `# ${team1.name} vs ${team2.name} — Premium Preview`,
    fixture
      ? `${fixture.league.round ?? "World Cup"} · ${new Date(fixture.fixture.date).toLocaleString()} · ${fixture.fixture.status.long}`
      : "Upcoming World Cup fixture",
    "",
    "## Win chances (API-Football model)",
    `| Outcome | Probability |`,
    `|---|---|`,
    `| **${team1.name}** | **${team1Win}** |`,
    `| Draw | ${pred.percent.draw} |`,
    `| **${team2.name}** | **${team2Win}** |`,
    "",
    pred.advice ? `**Tip:** ${pred.advice}` : "",
    pred.underOver ? `**Goals:** ${pred.underOver}` : "",
    pred.winner.name ? `**Predicted edge:** ${pred.winner.name} — ${pred.winner.comment}` : "",
    "",
    formatTeamSection(team1.name, homeIsTeam1 ? pred.homeTeam : pred.awayTeam),
    "",
    formatTeamSection(team2.name, homeIsTeam1 ? pred.awayTeam : pred.homeTeam),
    "",
    "## Head-to-head",
    played.length
      ? `Finished meetings: ${played.length}`
      : "No previous finished meetings in API data — first meeting in this dataset.",
    ...h2h.map(
      (m) =>
        `- ${new Date(m.fixture.date).toLocaleDateString()}: ${m.teams.home.name} ${m.goals.home ?? "-"}-${m.goals.away ?? "-"} ${m.teams.away.name} (${m.fixture.status.long})`
    ),
    "",
    "## Side-by-side comparison",
    formatComparison(pred),
  ];

  return lines.filter((l) => l !== "").join("\n");
}

/** Build rich premium analysis for two teams by ID or natural-language message. */
export async function buildPremiumReportForTeams(
  team1: { id: number; name: string },
  team2: { id: number; name: string }
): Promise<PremiumMatchReport> {
  const [h2h, window] = await Promise.all([
    getHeadToHead(team1.id, team2.id).catch(() => [] as Match[]),
    loadWorldCupTournamentMatches(),
  ]);

  let fixture = findUpcomingFixture(team1.id, team2.id, h2h, window);
  let prediction: FixturePrediction | null = null;

  if (fixture) {
    prediction = await getFixturePrediction(fixture.fixture.id);
    if (!prediction) prediction = getFallbackPrediction(fixture.fixture.id);
  } else {
    const fbFixture = findFallbackFixture(team1.id, team2.id);
    if (fbFixture) {
      fixture = fbFixture;
      prediction = getFallbackPrediction(fbFixture.fixture.id);
    }
  }

  if (prediction) {
    return {
      team1,
      team2,
      fixtureId: fixture!.fixture.id,
      prediction,
      report: buildReportFromPrediction(team1, team2, fixture, prediction, h2h),
    };
  }

  // Fallback when predictions unavailable — still return form from WC scan
  const [t1Results, t2Results] = await Promise.all([
    getTeamWorldCupResults(team1.id, 5),
    getTeamWorldCupResults(team2.id, 5),
  ]);

  const report = [
    `# ${team1.name} vs ${team2.name} — Premium Preview`,
    "",
    "_Win probability model unavailable for this fixture. Showing available World Cup form._",
    "",
    `### ${team1.name} — recent World Cup results`,
    ...(t1Results.length
      ? t1Results.map((m) => {
          const isHome = m.teams.home.id === team1.id;
          const gf = isHome ? m.goals.home : m.goals.away;
          const ga = isHome ? m.goals.away : m.goals.home;
          const r = gf! > ga! ? "W" : gf! < ga! ? "L" : "D";
          return `- ${new Date(m.fixture.date).toLocaleDateString()} · ${r} · ${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`;
        })
      : ["- No finished World Cup matches in API window"]),
    "",
    `### ${team2.name} — recent World Cup results`,
    ...(t2Results.length
      ? t2Results.map((m) => {
          const isHome = m.teams.home.id === team2.id;
          const gf = isHome ? m.goals.home : m.goals.away;
          const ga = isHome ? m.goals.away : m.goals.home;
          const r = gf! > ga! ? "W" : gf! < ga! ? "L" : "D";
          return `- ${new Date(m.fixture.date).toLocaleDateString()} · ${r} · ${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`;
        })
      : ["- No finished World Cup matches in API window"]),
    "",
    "## Head-to-head",
    ...h2h.map(
      (m) =>
        `- ${new Date(m.fixture.date).toLocaleDateString()}: ${m.teams.home.name} ${m.goals.home ?? "TBD"}-${m.goals.away ?? "TBD"} ${m.teams.away.name}`
    ),
  ].join("\n");

  return { team1, team2, fixtureId: fixture?.fixture.id ?? null, prediction: null, report };
}

function formatRecentForm(results: Match[], teamId: number): string {
  if (!results.length) return "no finished World Cup games in feed";
  return results
    .map((m) => {
      const isHome = m.teams.home.id === teamId;
      const gf = isHome ? m.goals.home! : m.goals.away!;
      const ga = isHome ? m.goals.away! : m.goals.home!;
      const r = gf > ga ? "W" : gf < ga ? "L" : "D";
      const opp = isHome ? m.teams.away.name : m.teams.home.name;
      return `${r} vs ${opp} (${gf}-${ga})`;
    })
    .join(", ");
}

/** Free preview of upcoming knockouts using real WC results — no invented scores. */
export async function buildFreeUpcomingAnalysis(limit = 4): Promise<string> {
  const upcoming = await getUpcomingWorldCupMatches(12);
  const fixtures = upcoming
    .filter((m) => {
      const home = m.teams.home.name?.trim() || "TBD";
      const away = m.teams.away.name?.trim() || "TBD";
      return home !== "TBD" && away !== "TBD";
    })
    .slice(0, limit);

  if (!fixtures.length) {
    return `${ninjaGreeting()} No upcoming fixtures with both teams confirmed yet, ninja — check back once the bracket is set.`;
  }

  const sections: string[] = [
    `${ninjaGreeting()} Here's a **preview of the next World Cup matches** (from live tournament data — not started yet):`,
    "",
  ];

  for (const m of fixtures) {
    const [homeResults, awayResults] = await Promise.all([
      getTeamWorldCupResults(m.teams.home.id, 3),
      getTeamWorldCupResults(m.teams.away.id, 3),
    ]);
    const dt = new Date(m.fixture.date);
    const when = `${dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;

    sections.push(`### ${m.teams.home.name} vs ${m.teams.away.name}`);
    sections.push(`**${m.league.round ?? "Knockout"}** · ${when}`);
    sections.push(`- **${m.teams.home.name}** form: ${formatRecentForm(homeResults, m.teams.home.id)}`);
    sections.push(`- **${m.teams.away.name}** form: ${formatRecentForm(awayResults, m.teams.away.id)}`);
    sections.push("");
  }

  const tbdCount = upcoming.filter(
    (m) => m.teams.home.name === "TBD" || m.teams.away.name === "TBD"
  ).length;
  if (tbdCount > 0) {
    sections.push(`_${tbdCount} later fixture${tbdCount === 1 ? "" : "s"} still waiting on bracket results (TBD vs TBD)._`);
    sections.push("");
  }

  sections.push(
    "_Want win % and head-to-head? Ask **\"win chances for France vs Morocco\"** (0.01 USDC) or unlock on the match page._"
  );

  return sections.join("\n");
}

interface TeamStrength {
  id: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  deepestRound: number;
  score: number;
}

/**
 * Premium tournament-winner forecast — data-grounded (never invents scores).
 * Ranks teams still in the tournament by tournament form + progress.
 */
export async function buildTournamentForecast(): Promise<string> {
  const matches = await loadWorldCupTournamentMatches();
  const knockout = matches.filter((m) => getKnockoutRoundOrder(m.league.round ?? "") > 0);

  // Determine who's been eliminated (lost a finished knockout tie)
  const eliminated = new Set<number>();
  for (const m of knockout) {
    if (!FINISHED.has(m.fixture.status.short)) continue;
    const winner = getKnockoutWinner(m);
    if (!winner) continue;
    const loser = m.teams.home.id === winner.id ? m.teams.away : m.teams.home;
    if (loser.id) eliminated.add(loser.id);
  }

  // Candidate teams: appeared in knockout, not eliminated, not TBD
  const candidates = new Map<number, Team>();
  for (const m of knockout) {
    for (const t of [m.teams.home, m.teams.away]) {
      if (t.id && !isTbdTeamName(t.name) && !eliminated.has(t.id)) candidates.set(t.id, t);
    }
  }

  // If knockouts haven't produced a bracket yet, fall back to all teams with finished games
  const finished = matches.filter((m) => FINISHED.has(m.fixture.status.short));
  if (candidates.size === 0) {
    for (const m of finished) {
      for (const t of [m.teams.home, m.teams.away]) {
        if (t.id && !isTbdTeamName(t.name)) candidates.set(t.id, t);
      }
    }
  }

  if (candidates.size === 0) {
    return `${ninjaGreeting()} The bracket isn't far enough along to forecast a winner yet, ninja — check back once knockout results are in.`;
  }

  // Build strength from every finished match
  const stats = new Map<number, TeamStrength>();
  const ensure = (t: Team): TeamStrength => {
    let s = stats.get(t.id);
    if (!s) {
      s = { id: t.id, name: t.name, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, deepestRound: 0, score: 0 };
      stats.set(t.id, s);
    }
    return s;
  };

  for (const m of finished) {
    if (!candidates.has(m.teams.home.id) && !candidates.has(m.teams.away.id)) continue;
    const hg = m.goals.home ?? 0;
    const ag = m.goals.away ?? 0;
    const round = getKnockoutRoundOrder(m.league.round ?? "");

    for (const [team, gf, ga] of [
      [m.teams.home, hg, ag],
      [m.teams.away, ag, hg],
    ] as [Team, number, number][]) {
      if (!candidates.has(team.id)) continue;
      const s = ensure(team);
      s.played++;
      s.gf += gf;
      s.ga += ga;
      if (gf > ga) s.wins++;
      else if (gf < ga) s.losses++;
      else s.draws++;
      if (round > s.deepestRound) s.deepestRound = round;
    }
  }

  const ranked: TeamStrength[] = [];
  for (const id of Array.from(candidates.keys())) {
    const t = candidates.get(id)!;
    const s = stats.get(id) ?? {
      id,
      name: t.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      deepestRound: 0,
      score: 0,
    };
    const gd = s.gf - s.ga;
    // Weighted score: results + goal diff + how deep they've gone
    s.score = s.wins * 3 + s.draws + gd * 0.6 + s.gf * 0.2 + s.deepestRound * 2 + 1;
    ranked.push(s);
  }

  ranked.sort((a, b) => b.score - a.score);

  const totalScore = ranked.reduce((sum, r) => sum + Math.max(r.score, 0.1), 0);
  const withProb = ranked.map((r) => ({
    ...r,
    prob: Math.round((Math.max(r.score, 0.1) / totalScore) * 100),
  }));

  const top = withProb.slice(0, 8);
  const favourite = top[0];

  const lines = [
    `${ninjaGreeting()} **World Cup winner forecast** — ${withProb.length} teams still in it.`,
    "",
    `My model favours **${favourite.name}** (~${favourite.prob}% to lift the trophy), based on tournament results, goal difference, and how deep each side has advanced.`,
    "",
    "| Rank | Team | Win-it-all | WC record | GD |",
    "|---|---|---|---|---|",
    ...top.map(
      (t, i) =>
        `| ${i + 1} | **${t.name}** | ${t.prob}% | ${t.wins}W-${t.draws}D-${t.losses}L | ${t.gf - t.ga > 0 ? "+" : ""}${t.gf - t.ga} |`
    ),
    "",
    "_Data-grounded projection from live World Cup results — not a guarantee. Odds shift with every match._",
  ];

  return lines.join("\n");
}

export async function buildPremiumMatchReport(
  message: string,
  context?: { homeTeam?: string; awayTeam?: string }
): Promise<PremiumMatchReport | null> {
  let resolved = await resolveTeamsFromMessage(message);

  if (!resolved && context?.homeTeam && context?.awayTeam) {
    const team1 = await searchTeam(context.homeTeam);
    const team2 = await searchTeam(context.awayTeam);
    if (team1 && team2) resolved = [team1, team2];
  }

  if (!resolved) return null;

  const [team1, team2] = resolved;
  return buildPremiumReportForTeams(team1, team2);
}
