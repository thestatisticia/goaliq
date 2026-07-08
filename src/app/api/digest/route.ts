import { NextResponse } from "next/server";
import { buildDailyDigest } from "@/lib/match-briefing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const digest = await buildDailyDigest();
    return NextResponse.json(digest, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
