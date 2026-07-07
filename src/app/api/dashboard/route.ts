import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/football-api";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET(req: NextRequest) {
  try {
    const tz = req.nextUrl.searchParams.get("tz");
    const data = await getDashboardData({ timeZone: tz ?? undefined });
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json(
      {
        error: (e as Error).message,
        live: [],
        fixtures: [],
        results: [],
        standings: [],
        source: "error",
        configured: false,
      },
      { status: 500, headers: NO_STORE }
    );
  }
}
