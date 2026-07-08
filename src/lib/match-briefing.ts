import {
  getFixturePrediction,
  getHeadToHead,
  getMatchById,
  getMatchPhase,
  getRecentResults,
  getTeamWorldCupResults,
  getTodaysWorldCupSchedule,
  getUpcomingWorldCupMatches,
} from "./football-api";
import { getFallbackPrediction } from "./prediction-fallback";
import type { Match } from "./types";

export interface MatchBriefingData {
  homeTeam: string;
  awayTeam: string;
  round: string;
  kickoff: string;
  status: string;
  bullets: string[];
  watchFor: string | null;
  form: { home: string; away: string };
  winProb: {
    home: string;
    away: string;
    draw: string;
    confidence: string;
    reasons: string[];
  } | null;
}

export interface DailyDigestData {
  date: string;
  headline: string;
  sections: { title: string; lines: string[] }[];
  markdown: string;
}

export interface TeamComparisonData {
  team1: { id: number; name: string; logo: string };
  team2: { id: number; name: string; logo: string };
  metrics: { label: string; team1: string; team2: string; edge: "team1" | "team2" | "even" }[];
  form: { team1: string; team2: string };
  winProb: { team1: string; team2: string; draw: string } | null;
  verdict: string;
  h2hSummary: string;
}

function formatRecentForm(results: Match[], teamId: number): string {
  if (!results.length) return "—";
  return results
    .map((m) => {
      const isHome = m.teams.home.id === teamId;
      const gf = isHome ? m.goals.home! : m.goals.away!;
      const ga = isHome ? m.goals.away! : m.goals.home!;
      const r = gf > ga ? "W" : gf < ga ? "L" : "D";
      return r;
    })
    .join("");
}

function countWins(results: Match[], teamId: number): number {
  return results.filter((m) => {
    const isHome = m.teams.home.id === teamId;
    const gf = isHome ? m.goals.home! : m.goals.away!;
    const ga = isHome ? m.goals.away! : m.goals.home!;
    return gf > ga;
  }).length;
}

function avgGoals(results: Match[], teamId: number): string {
  if (!results.length) return "0.0";
  const total = results.reduce((sum, m) => {
    const isHome = m.teams.home.id === teamId;
    return sum + (isHome ? m.goals.home! : m.goals.away!);
  }, 0);
  return (total / results.length).toFixed(1);
}

/** One-tap pre-match briefing from live tournament data. */
export async function buildMatchBriefing(matchId: number): Promise<MatchBriefingData | null> {
  const match = await getMatchById(matchId);
  if (!match) return null;

  const home = match.teams.home;
  const away = match.teams.away;
  if (home.name === "TBD" || away.name === "TBD") return null;

  const [homeResults, awayResults, h2h] = await Promise.all([
    getTeamWorldCupResults(home.id, 5),
    getTeamWorldCupResults(away.id, 5),
    getHeadToHead(home.id, away.id).catch(() => [] as Match[]),
  ]);

  const homeWins = countWins(homeResults, home.id);
  const awayWins = countWins(awayResults, away.id);
  const homeForm = formatRecentForm(homeResults, home.id);
  const awayForm = formatRecentForm(awayResults, away.id);

  const bullets: string[] = [];
  if (homeResults.length) {
    bullets.push(`${home.name} are ${homeWins}W in their last ${homeResults.length} World Cup matches (form: ${homeForm || "—"}).`);
  }
  if (awayResults.length) {
    bullets.push(`${away.name} are ${awayWins}W in their last ${awayResults.length} World Cup matches (form: ${awayForm || "—"}).`);
  }
  if (homeResults.length) {
    bullets.push(`${home.name} average ${avgGoals(homeResults, home.id)} goals per game in this tournament.`);
  }
  if (awayResults.length) {
    bullets.push(`${away.name} average ${avgGoals(awayResults, away.id)} goals per game in this tournament.`);
  }

  const playedH2h = h2h.filter((m) => m.goals.home != null);
  if (playedH2h.length) {
    bullets.push(`These sides have met ${playedH2h.length} time(s) in this dataset.`);
  } else {
    bullets.push("No previous head-to-head meetings in the current data feed.");
  }

  let winProb: MatchBriefingData["winProb"] = null;
  let watchFor: string | null = null;

  const phase = getMatchPhase(match);
  if (phase === "upcoming") {
    let pred = await getFixturePrediction(matchId);
    if (!pred) pred = getFallbackPrediction(matchId);

    if (pred) {
      const homeIsPredHome = pred.home.name.toLowerCase() === home.name.toLowerCase();
      const pHome = homeIsPredHome ? pred.percent.home : pred.percent.away;
      const pAway = homeIsPredHome ? pred.percent.away : pred.percent.home;
      const homeNum = parseInt(pHome, 10);
      const awayNum = parseInt(pAway, 10);
      const confidence = Math.abs(homeNum - awayNum) >= 15 ? "High" : Math.abs(homeNum - awayNum) >= 8 ? "Medium" : "Low";

      const reasons: string[] = [];
      if (homeForm && awayForm) {
        const homeScore = homeForm.split("").filter((c) => c === "W").length;
        const awayScore = awayForm.split("").filter((c) => c === "W").length;
        if (homeScore > awayScore) reasons.push("Better recent tournament form");
        else if (awayScore > homeScore) reasons.push(`${away.name} in stronger recent form`);
      }
      if (parseFloat(avgGoals(homeResults, home.id)) > parseFloat(avgGoals(awayResults, away.id))) {
        reasons.push("Stronger attack in this World Cup");
      } else if (parseFloat(avgGoals(awayResults, away.id)) > parseFloat(avgGoals(homeResults, home.id))) {
        reasons.push(`${away.name} scoring more per game`);
      }
      if (pred.advice) reasons.push(pred.advice);

      winProb = { home: pHome, away: pAway, draw: pred.percent.draw, confidence, reasons: reasons.slice(0, 3) };
      watchFor = pred.winner.comment
        ? `${pred.winner.name}: ${pred.winner.comment}`
        : `Watch the battle between ${home.name}'s attack and ${away.name}'s defence.`;
    }
  } else if (phase === "finished") {
    bullets.unshift(`Full time — see events below for the full story.`);
    watchFor = null;
  }

  const kickoff = new Date(match.fixture.date).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  return {
    homeTeam: home.name,
    awayTeam: away.name,
    round: match.league.round ?? "World Cup",
    kickoff: `${kickoff} UTC`,
    status: match.fixture.status.long,
    bullets,
    watchFor,
    form: { home: homeForm || "—", away: awayForm || "—" },
    winProb,
  };
}

/** Morning-style tournament digest for the dashboard. */
export async function buildDailyDigest(): Promise<DailyDigestData> {
  const today = new Date().toISOString().slice(0, 10);
  const [schedule, upcoming, recent] = await Promise.all([
    getTodaysWorldCupSchedule(),
    getUpcomingWorldCupMatches(6),
    getRecentResults(3),
  ]);

  const todayCount =
    schedule.live.length + schedule.finished.length + schedule.upcoming.length;
  const sections: DailyDigestData["sections"] = [];

  sections.push({
    title: "Today",
    lines:
      todayCount === 0
        ? ["No World Cup matches on today's calendar."]
        : [
            `${todayCount} match${todayCount === 1 ? "" : "es"} today.`,
            ...schedule.live.map(
              (m) => `🔴 Live: ${m.teams.home.name} ${m.goals.home ?? "-"}–${m.goals.away ?? "-"} ${m.teams.away.name}`
            ),
            ...schedule.upcoming.map((m) => {
              const t = new Date(m.fixture.date).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC",
              });
              return `⏱ ${m.teams.home.name} vs ${m.teams.away.name} at ${t} UTC`;
            }),
          ],
  });

  const namedUpcoming = upcoming.filter(
    (m) => m.teams.home.name !== "TBD" && m.teams.away.name !== "TBD"
  );
  if (namedUpcoming.length) {
    const biggest = namedUpcoming[0];
    sections.push({
      title: "Next up",
      lines: namedUpcoming.slice(0, 4).map((m) => {
        const d = new Date(m.fixture.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        return `${d}: ${m.teams.home.name} vs ${m.teams.away.name} (${m.league.round ?? "KO"})`;
      }),
    });
    sections.push({
      title: "Match of the day",
      lines: [`${biggest.teams.home.name} vs ${biggest.teams.away.name} — ${biggest.league.round ?? "Knockout"}.`],
    });
  }

  if (recent.length) {
    const surprise = recent[0];
    sections.push({
      title: "Latest result",
      lines: [
        `${surprise.teams.home.name} ${surprise.goals.home}–${surprise.goals.away} ${surprise.teams.away.name} (${surprise.league.round ?? "WC"}).`,
      ],
    });
  }

  const markdown = [
    `# Today's World Cup Brief`,
    "",
    ...sections.flatMap((s) => [`## ${s.title}`, ...s.lines.map((l) => `- ${l}`), ""]),
  ].join("\n");

  return {
    date: today,
    headline: todayCount > 0 ? `${todayCount} matches today` : "Knockout phase continues",
    sections,
    markdown,
  };
}

/** Structured comparison for /compare page. */
export async function buildTeamComparison(
  team1: { id: number; name: string; logo: string },
  team2: { id: number; name: string; logo: string }
): Promise<TeamComparisonData> {
  const [r1, r2, h2h, upcoming] = await Promise.all([
    getTeamWorldCupResults(team1.id, 8),
    getTeamWorldCupResults(team2.id, 8),
    getHeadToHead(team1.id, team2.id).catch(() => [] as Match[]),
    getUpcomingWorldCupMatches(50),
  ]);

  const form1 = formatRecentForm(r1, team1.id);
  const form2 = formatRecentForm(r2, team2.id);
  const g1 = avgGoals(r1, team1.id);
  const g2 = avgGoals(r2, team2.id);
  const w1 = countWins(r1, team1.id);
  const w2 = countWins(r2, team2.id);

  const stars = (wins: number, played: number) => {
    if (!played) return "★★☆☆☆";
    const ratio = wins / played;
    if (ratio >= 0.75) return "★★★★★";
    if (ratio >= 0.5) return "★★★★☆";
    if (ratio >= 0.35) return "★★★☆☆";
    return "★★☆☆☆";
  };

  const metrics: TeamComparisonData["metrics"] = [
    {
      label: "Tournament form",
      team1: stars(w1, r1.length),
      team2: stars(w2, r2.length),
      edge: w1 > w2 ? "team1" : w2 > w1 ? "team2" : "even",
    },
    {
      label: "Form string",
      team1: form1 || "—",
      team2: form2 || "—",
      edge: "even",
    },
    {
      label: "Avg goals",
      team1: g1,
      team2: g2,
      edge: parseFloat(g1) > parseFloat(g2) ? "team1" : parseFloat(g2) > parseFloat(g1) ? "team2" : "even",
    },
    {
      label: "Wins in feed",
      team1: String(w1),
      team2: String(w2),
      edge: w1 > w2 ? "team1" : w2 > w1 ? "team2" : "even",
    },
  ];

  const fixture = upcoming.find(
    (m) =>
      (m.teams.home.id === team1.id && m.teams.away.id === team2.id) ||
      (m.teams.home.id === team2.id && m.teams.away.id === team1.id)
  );

  let winProb: TeamComparisonData["winProb"] = null;
  if (fixture) {
    let pred = await getFixturePrediction(fixture.fixture.id);
    if (!pred) pred = getFallbackPrediction(fixture.fixture.id);
    if (pred) {
      const t1Home = pred.home.id === team1.id;
      winProb = {
        team1: t1Home ? pred.percent.home : pred.percent.away,
        team2: t1Home ? pred.percent.away : pred.percent.home,
        draw: pred.percent.draw,
      };
    }
  }

  const played = h2h.filter((m) => m.goals.home != null);
  const h2hSummary = played.length
    ? `${played.length} meeting(s) in dataset`
    : "No finished H2H in current feed";

  let verdict = "Too close to call from form alone.";
  if (winProb) {
    const p1 = parseInt(winProb.team1, 10);
    const p2 = parseInt(winProb.team2, 10);
    if (p1 > p2 + 5) verdict = `${team1.name} by a slight margin (${winProb.team1} win chance).`;
    else if (p2 > p1 + 5) verdict = `${team2.name} by a slight margin (${winProb.team2} win chance).`;
    else verdict = "Evenly matched — could go either way.";
  } else if (w1 > w2) verdict = `${team1.name} arrive with stronger recent form.`;
  else if (w2 > w1) verdict = `${team2.name} arrive with stronger recent form.`;

  return {
    team1,
    team2,
    metrics,
    form: { team1: form1, team2: form2 },
    winProb,
    verdict,
    h2hSummary,
  };
}
