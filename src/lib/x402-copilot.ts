import {
  buildPremiumMatchReport,
  buildPremiumReportForTeams,
  buildTournamentForecast,
} from "@/lib/match-analysis";
import {
  isSingleMatchAnalysisQuery,
  isTournamentForecastQuery,
} from "@/lib/copilot";
import { ninjaGreeting } from "@/lib/copilot-personality";
import { resolveTeamsFromMessage } from "@/lib/team-resolver";
import type { CopilotContext } from "@/lib/types";

/** Premium copilot reply after x402 payment is verified. */
export async function generateCopilotPremiumReply(
  message: string,
  context?: CopilotContext
): Promise<string> {
  if (isTournamentForecastQuery(message)) {
    return buildTournamentForecast();
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
