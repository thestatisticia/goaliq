import { NextRequest } from "next/server";
import { PRICING } from "@/lib/payments";
import { requireX402Payment, x402PaidJson } from "@/lib/x402-gate";
import { buildAnalysisUnlock } from "@/lib/premium-unlock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const matchId = Number(req.nextUrl.searchParams.get("matchId"));
  if (!matchId) {
    return Response.json({ error: "matchId required" }, { status: 400 });
  }

  const resourceUrl = req.nextUrl.toString();
  const gate = await requireX402Payment(req, {
    amountUsdc: PRICING.report.usdc,
    description: "GOALIQ tactical match analysis",
    resourceUrl,
  });

  if (!gate.ok) return gate.response;

  const payload = await buildAnalysisUnlock(matchId);
  if (!payload) return Response.json({ error: "Match not found" }, { status: 404 });

  return x402PaidJson(payload, gate.txHash, gate.payer);
}
