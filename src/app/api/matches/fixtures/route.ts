import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const matches = await getFixtures();
    return NextResponse.json({ matches, source: "api", count: matches.length, date: new Date().toISOString().slice(0, 10) });
  } catch (e) {
    return NextResponse.json({ matches: [], source: "error", error: (e as Error).message }, { status: 500 });
  }
}
