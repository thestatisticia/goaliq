import { NextResponse } from "next/server";
import { PREMIUM_USDC } from "@/lib/payments";
import { getPaymentWalletServer } from "@/lib/payments-server";
import { verifyTxPayment } from "@/lib/x402-gate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { txHash, from, amount } = await request.json();
  const expectedUsdc = typeof amount === "number" && amount > 0 ? amount : PREMIUM_USDC;

  if (!getPaymentWalletServer()) {
    return NextResponse.json({ verified: false, error: "Payment wallet not configured" }, { status: 503 });
  }

  if (!txHash || !from) {
    return NextResponse.json({ verified: false, error: "Missing txHash or from address" }, { status: 400 });
  }

  const result = await verifyTxPayment(txHash, from, expectedUsdc);
  if (!result.verified) {
    return NextResponse.json({ verified: false, error: result.error ?? "Payment verification failed" });
  }

  return NextResponse.json({ verified: true, txHash, amount: expectedUsdc });
}
