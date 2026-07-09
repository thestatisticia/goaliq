import { NextResponse } from "next/server";
import { getMatchDetail } from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);

  try {
    const detail = await getMatchDetail(id);
    if (!detail) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    return NextResponse.json({
      match: detail.match,
      events: detail.events,
      statistics: detail.statistics,
      referee: detail.referee,
      statsAvailable: detail.statsAvailable,
      extrasNote: detail.extrasNote,
      source: detail.source,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
