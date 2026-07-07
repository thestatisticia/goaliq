import { CopilotPageClient } from "@/components/CopilotPageClient";
import type { CopilotContext } from "@/lib/types";

export default function CopilotPage({
  searchParams,
}: {
  searchParams: { matchId?: string; home?: string; away?: string; score?: string; status?: string };
}) {
  const context: CopilotContext | undefined =
    searchParams.home && searchParams.away
      ? {
          matchId: searchParams.matchId ? Number(searchParams.matchId) : undefined,
          homeTeam: searchParams.home,
          awayTeam: searchParams.away,
          score: searchParams.score,
          status: searchParams.status,
        }
      : undefined;

  return <CopilotPageClient context={context} />;
}
