import { NextRequest, NextResponse } from "next/server";
import { buildTeamComparison } from "@/lib/match-briefing";
import { searchTeam } from "@/lib/team-resolver";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const team1Query = req.nextUrl.searchParams.get("team1");
  const team2Query = req.nextUrl.searchParams.get("team2");

  if (!team1Query || !team2Query) {
    return NextResponse.json({ error: "team1 and team2 query params required" }, { status: 400 });
  }

  try {
    const [team1, team2] = await Promise.all([searchTeam(team1Query), searchTeam(team2Query)]);
    if (!team1 || !team2) {
      return NextResponse.json({ error: "Could not resolve one or both teams" }, { status: 404 });
    }
    const comparison = await buildTeamComparison(team1, team2);
    return NextResponse.json({ comparison });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
