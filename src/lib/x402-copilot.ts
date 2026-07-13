import {
  buildPremiumMatchReport,
  buildPremiumReportForTeams,
  buildTournamentForecast,
} from "@/lib/match-analysis";
import {
  formatTeamFormReply,
  isSingleMatchAnalysisQuery,
  isTeamFormQuery,
  isTournamentForecastQuery,
} from "@/lib/copilot";
import { ninjaGreeting } from "@/lib/copilot-personality";
import { findTeamMentionedInMessage, resolveTeamsFromMessage } from "@/lib/team-resolver";
import { getTeamWorldCupResults } from "@/lib/football-api";
import type { CopilotContext } from "@/lib/types";

/** Premium copilot reply after x402 payment is verified. */
export async function generateCopilotPremiumReply(
  message: string,
  context?: CopilotContext
): Promise<string> {
  if (isTournamentForecastQuery(message)) {
    return buildTournamentForecast();
  }

  if (isTeamFormQuery(message)) {
    const team = await findTeamMentionedInMessage(message);
    if (!team) {
      return `${ninjaGreeting()} Which team, ninja? Try "How has France performed recently?"`;
    }
    const results = await getTeamWorldCupResults(team.id, 5);
    return formatTeamFormReply(team, results);
  }

  if (isSingleMatchAnalysisQuery(message)) {
    const teams = await resolveTeamsFromMessage(message);
    if (teams) {
      const premium = await buildPremiumReportForTeams(teams[0], teams[1]);
      return premium.report;
    }
    return `${ninjaGreeting()} Name both teams clearly, e.g. **"analyze France vs Morocco"**.`;
  }

  const premium = await buildPremiumMatchReport(message, {
    homeTeam: context?.homeTeam,
    awayTeam: context?.awayTeam,
  });

  if (premium) return premium.report;

  return `${ninjaGreeting()} I couldn't find that matchup. Try **"win chances for Switzerland"** or **"Switzerland vs Colombia"**.`;
}
