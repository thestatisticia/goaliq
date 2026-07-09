import { NextResponse } from "next/server";
import { getApiFootballHealth } from "@/lib/api-football-client";
import { isFootballDataConfigured } from "@/lib/football-data-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const [apiFootball, footballData] = await Promise.all([
    getApiFootballHealth(),
    Promise.resolve(isFootballDataConfigured()),
  ]);

  return NextResponse.json(
    {
      footballData: {
        configured: footballData,
        providesScores: true,
        providesGoalEvents: false,
        providesTeamStats: false,
        note: "football-data.org WC 2026 matches include scores but not goal-by-goal events or team statistics on the free tier.",
      },
      apiFootball,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
