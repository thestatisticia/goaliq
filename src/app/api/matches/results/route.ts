import { NextResponse } from "next/server";
import { getRecentResults } from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const last = Number(searchParams.get("last") ?? 10);

  try {
    const matches = await getRecentResults(last);
    return NextResponse.json({ matches, source: "api", count: matches.length });
  } catch (e) {
    return NextResponse.json({ matches: [], source: "error", error: (e as Error).message }, { status: 500 });
  }
}
