import { NextResponse } from "next/server";
import { getPaymentWalletServer, isPaymentsEnabledServer } from "@/lib/payments-server";
import { INJECTIVE_TESTNET } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const paymentWallet = getPaymentWalletServer();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json(
    {
      paymentWallet,
      paymentsEnabled: isPaymentsEnabledServer(),
      x402: {
        enabled: isPaymentsEnabledServer(),
        network: INJECTIVE_TESTNET.network,
        usdc: INJECTIVE_TESTNET.usdc,
        facilitatorUrl: process.env.X402_FACILITATOR_URL ?? "https://x402.injective.network",
        endpoints: {
          analysis: `${appUrl}/api/x402/premium/analysis`,
          h2h: `${appUrl}/api/x402/premium/h2h`,
          copilot: `${appUrl}/api/x402/copilot`,
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
