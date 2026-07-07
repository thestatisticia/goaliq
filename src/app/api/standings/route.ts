import { NextResponse } from "next/server";
import { getStandings } from "@/lib/football-api";

export async function GET() {
  try {
    const standings = await getStandings();
    return NextResponse.json({ standings, source: "api", note: "Knockout rounds from live fixture data" });
  } catch (e) {
    return NextResponse.json({ standings: [], source: "error", error: (e as Error).message }, { status: 500 });
  }
}
