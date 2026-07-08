import { NextResponse } from "next/server";
import { getPaymentWalletServer, isPaymentsEnabledServer } from "@/lib/payments-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const paymentWallet = getPaymentWalletServer();
  return NextResponse.json(
    {
      paymentWallet,
      paymentsEnabled: isPaymentsEnabledServer(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
