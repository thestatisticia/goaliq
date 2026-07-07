import {
  getFixturePrediction,
  getHeadToHead,
  getTeamWorldCupResults,
  loadWorldCupTournamentMatches,
  type FixturePrediction,
} from "./football-api";
import { getFallbackPrediction, findFallbackFixture } from "./prediction-fallback";
import { resolveTeamsFromMessage, searchTeam } from "./team-resolver";
import type { Match } from "./types";

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
