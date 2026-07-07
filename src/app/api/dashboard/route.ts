import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, live: [], fixtures: [], results: [], standings: [], source: "error" },
      { status: 500 }
    );
  }
}
