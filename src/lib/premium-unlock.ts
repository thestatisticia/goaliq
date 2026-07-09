import { getHeadToHead, getMatchById, getMatchEvents, getMatchStats } from "./football-api";
import { buildPremiumReportForTeams } from "./match-analysis";
import { PRICING } from "./payments";

export async function buildAnalysisUnlock(matchId: number) {
  const match = await getMatchById(matchId);
  if (!match) return null;

  const premium = await buildPremiumReportForTeams(match.teams.home, match.teams.away);
  const [events, stats] = await Promise.all([getMatchEvents(matchId), getMatchStats(matchId)]);

  return {
    premium: true,
    type: "tactical-analysis" as const,
    paidVia: "x402" as const,
    price: `${PRICING.report.usdc} USDC`,
    report: premium.report,
    prediction: premium.prediction,
    match,
    events,
    stats,
  };
}

export async function buildH2hUnlock(team1: number, team2: number) {
  const h2hMatches = await getHeadToHead(team1, team2);
  const sample = h2hMatches[0];
  const t1 = sample
    ? sample.teams.home.id === team1
      ? sample.teams.home
      : sample.teams.away
    : { id: team1, name: `Team ${team1}` };
  const t2 = sample
    ? sample.teams.home.id === team2
      ? sample.teams.home
      : sample.teams.away
    : { id: team2, name: `Team ${team2}` };

  const premium = await buildPremiumReportForTeams(t1, t2);
  return {
    premium: true,
    type: "head-to-head" as const,
    paidVia: "x402" as const,
    price: `${PRICING.insight.usdc} USDC`,
    fixtureId: premium.fixtureId,
    report: premium.report,
    prediction: premium.prediction,
  };
}
