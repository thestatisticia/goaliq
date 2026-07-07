import { NextResponse } from "next/server";
import { getHeadToHead, getMatchById, getMatchEvents, getMatchStats } from "@/lib/football-api";
import { buildPremiumReportForTeams } from "@/lib/match-analysis";

const MIN_USDC = 0.01;

export async function POST(request: Request) {
  const body = await request.json();
  const { type, matchId, team1, team2, evmAddress, txHash } = body;

  if (!evmAddress) {
    return NextResponse.json({ error: "Connect Keplr wallet first" }, { status: 401 });
  }

  if (!txHash) {
    return NextResponse.json({ error: "Payment required — 0.01 USDC txHash missing" }, { status: 402 });
  }

  // Verify on-chain payment
  const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/payment/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, from: evmAddress }),
  });
  const verified = await verifyRes.json();
  if (!verified.verified) {
    return NextResponse.json({ error: verified.error ?? "Invalid payment" }, { status: 402 });
  }

  try {
    if (type === "analysis" && matchId) {
      const match = await getMatchById(Number(matchId));
      if (match) {
        const premium = await buildPremiumReportForTeams(match.teams.home, match.teams.away);
        const [events, stats] = await Promise.all([
          getMatchEvents(Number(matchId)),
          getMatchStats(Number(matchId)),
        ]);
        return NextResponse.json({
          premium: true,
          type: "tactical-analysis",
          paidVia: "usdc-on-chain",
          price: `${MIN_USDC} USDC`,
          report: premium.report,
          prediction: premium.prediction,
          match,
          events,
          stats,
        });
      }

      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (type === "h2h" && team1 && team2) {
      const h2hMatches = await getHeadToHead(Number(team1), Number(team2));
      const sample = h2hMatches[0];
      const t1 = sample
        ? sample.teams.home.id === Number(team1)
          ? sample.teams.home
          : sample.teams.away
        : { id: Number(team1), name: `Team ${team1}` };
      const t2 = sample
        ? sample.teams.home.id === Number(team2)
          ? sample.teams.home
          : sample.teams.away
        : { id: Number(team2), name: `Team ${team2}` };

      const premium = await buildPremiumReportForTeams(t1, t2);
      return NextResponse.json({
        premium: true,
        type: "head-to-head",
        paidVia: "usdc-on-chain",
        price: `${MIN_USDC} USDC`,
        fixtureId: premium.fixtureId,
        report: premium.report,
        prediction: premium.prediction,
      });
    }

    return NextResponse.json({ error: "Invalid premium request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
