import { NextRequest } from "next/server";
import { PRICING } from "@/lib/payments";
import { requireX402Payment, x402PaidJson } from "@/lib/x402-gate";
import { buildH2hUnlock } from "@/lib/premium-unlock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const team1 = Number(req.nextUrl.searchParams.get("team1"));
  const team2 = Number(req.nextUrl.searchParams.get("team2"));
  if (!team1 || !team2) {
    return Response.json({ error: "team1 and team2 required" }, { status: 400 });
  }

  const resourceUrl = req.nextUrl.toString();
  const gate = await requireX402Payment(req, {
    amountUsdc: PRICING.insight.usdc,
    description: "GOALIQ head-to-head premium insight",
    resourceUrl,
  });

  if (!gate.ok) return gate.response;

  const payload = await buildH2hUnlock(team1, team2);
  return x402PaidJson(payload, gate.txHash, gate.payer);
}
