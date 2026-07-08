import { NextResponse } from "next/server";
import { createPublicClient, http, parseUnits } from "viem";
import { INJECTIVE_TESTNET } from "@/lib/constants";
import { getPaymentWalletServer } from "@/lib/payments-server";
import { PREMIUM_USDC } from "@/lib/payments";

export const dynamic = "force-dynamic";

const client = createPublicClient({
  transport: http(INJECTIVE_TESTNET.rpcUrl),
});

export async function POST(request: Request) {
  const { txHash, from } = await request.json();
  const payTo = getPaymentWalletServer();

  if (!payTo) {
    return NextResponse.json({ verified: false, error: "Payment wallet not configured" }, { status: 503 });
  }

  if (!txHash || !from) {
    return NextResponse.json({ verified: false, error: "Missing txHash or from address" }, { status: 400 });
  }

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      return NextResponse.json({ verified: false, error: "Transaction failed" });
    }

    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const expectedAmount = parseUnits(String(PREMIUM_USDC), 6);

    const valid = receipt.logs.some((log) => {
      if (log.address.toLowerCase() !== INJECTIVE_TESTNET.usdc.toLowerCase()) return false;
      if (log.topics[0] !== transferTopic) return false;
      const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase();
      const fromAddr = `0x${log.topics[1]?.slice(26)}`.toLowerCase();
      const amount = BigInt(log.data);
      return (
        to === payTo.toLowerCase() &&
        fromAddr === (from as string).toLowerCase() &&
        amount >= expectedAmount
      );
    });

    if (!valid) {
      return NextResponse.json({
        verified: false,
        error: `Payment verification failed. Expected ${PREMIUM_USDC} USDC transfer on Injective testnet.`,
      });
    }

    return NextResponse.json({ verified: true, txHash, amount: PREMIUM_USDC });
  } catch (e) {
    return NextResponse.json({ verified: false, error: (e as Error).message }, { status: 500 });
  }
}
