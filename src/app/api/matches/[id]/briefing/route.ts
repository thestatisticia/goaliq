import { NextResponse } from "next/server";
import { buildMatchBriefing } from "@/lib/match-briefing";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const briefing = await buildMatchBriefing(Number(params.id));
    if (!briefing) {
      return NextResponse.json({ error: "Match not found or teams TBD" }, { status: 404 });
    }
    return NextResponse.json({ briefing });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
