import { NextResponse } from "next/server";
import { getLiveMatches } from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const matches = await getLiveMatches();
    return NextResponse.json({ matches, source: "api", count: matches.length });
  } catch (e) {
    return NextResponse.json({ matches: [], source: "error", error: (e as Error).message }, { status: 500 });
  }
}
