import { NextRequest } from "next/server";
import { getTierForQuery } from "@/lib/payments";
import { requireX402Payment, x402PaidJson } from "@/lib/x402-gate";
import { generateCopilotPremiumReply } from "@/lib/x402-copilot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  const tier = getTierForQuery(message);
  const resourceUrl = req.nextUrl.toString();

  const gate = await requireX402Payment(req, {
    amountUsdc: tier.usdc,
    description: `GOALIQ copilot · ${tier.label}`,
    resourceUrl,
  });

  if (!gate.ok) return gate.response;

  const reply = await generateCopilotPremiumReply(message, body.context);
  return x402PaidJson(
    {
      reply,
      tier: tier.id,
      price: `${tier.usdc} USDC`,
      paidVia: "x402",
    },
    gate.txHash,
    gate.payer
  );
}
