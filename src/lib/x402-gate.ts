import { NextResponse } from "next/server";
import { createPublicClient, http, parseUnits } from "viem";
import { INJECTIVE_TESTNET } from "./constants";
import { getPaymentWalletServer } from "./payments-server";

const client = createPublicClient({
  transport: http(INJECTIVE_TESTNET.rpcUrl),
});

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface X402Quote {
  amountUsdc: number;
  description: string;
  resourceUrl: string;
}

function atomicAmount(amountUsdc: number): string {
  return parseUnits(String(amountUsdc), 6).toString();
}

export function buildPaymentRequirements(amountUsdc: number, payTo: `0x${string}`) {
  return [
    {
      scheme: "exact" as const,
      network: INJECTIVE_TESTNET.network,
      amount: atomicAmount(amountUsdc),
      payTo,
      maxTimeoutSeconds: 120,
      asset: INJECTIVE_TESTNET.usdc,
      extra: {
        name: "USDC",
        version: "2",
        assetTransferMethod: "eip3009",
        /** GOALIQ browser wallets may settle via Keplr ERC20 transfer + X-PAYMENT-TX retry */
        browserFallback: "x-payment-tx",
      },
    },
  ];
}

export function x402PaymentRequired(quote: X402Quote) {
  const payTo = getPaymentWalletServer();
  if (!payTo) {
    return NextResponse.json({ error: "Payment wallet not configured" }, { status: 503 });
  }

  const accepts = buildPaymentRequirements(quote.amountUsdc, payTo);
  const body = {
    x402Version: 2 as const,
    error: "PAYMENT-SIGNATURE or X-PAYMENT-TX header is required",
    resource: {
      url: quote.resourceUrl,
      description: quote.description,
      mimeType: "application/json",
      serviceName: "GOALIQ",
    },
    accepts,
  };

  const encoded = Buffer.from(JSON.stringify(body)).toString("base64");
  return NextResponse.json(body, {
    status: 402,
    headers: {
      "PAYMENT-REQUIRED": encoded,
      "Cache-Control": "no-store",
    },
  });
}

export async function verifyTxPayment(
  txHash: string,
  from: string,
  amountUsdc: number
): Promise<{ verified: boolean; error?: string }> {
  const payTo = getPaymentWalletServer();
  if (!payTo) return { verified: false, error: "Payment wallet not configured" };

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (receipt.status !== "success") return { verified: false, error: "Transaction failed" };

    const expectedAmount = parseUnits(String(amountUsdc), 6);
    const valid = receipt.logs.some((log) => {
      if (log.address.toLowerCase() !== INJECTIVE_TESTNET.usdc.toLowerCase()) return false;
      if (log.topics[0] !== TRANSFER_TOPIC) return false;
      const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase();
      const fromAddr = `0x${log.topics[1]?.slice(26)}`.toLowerCase();
      const amount = BigInt(log.data);
      return (
        to === payTo.toLowerCase() &&
        fromAddr === from.toLowerCase() &&
        amount >= expectedAmount
      );
    });

    if (!valid) {
      return {
        verified: false,
        error: `Expected ${amountUsdc} USDC transfer on Injective testnet`,
      };
    }
    return { verified: true };
  } catch (e) {
    return { verified: false, error: (e as Error).message };
  }
}

export function readX402PaymentHeaders(request: Request): {
  txHash: string | null;
  payer: string | null;
} {
  const txHash =
    request.headers.get("x-payment-tx") ??
    request.headers.get("X-PAYMENT-TX");
  const payer =
    request.headers.get("x-payer-address") ??
    request.headers.get("X-PAYER-ADDRESS");
  return { txHash, payer };
}

export function x402PaidJson(data: unknown, txHash: string, payer: string) {
  const receipt = {
    success: true,
    transaction: txHash,
    network: INJECTIVE_TESTNET.network,
    payer,
  };
  const encoded = Buffer.from(JSON.stringify(receipt)).toString("base64");
  return NextResponse.json(
    { ...((typeof data === "object" && data !== null ? data : { data }) as object), x402: { paid: true, ...receipt } },
    {
      headers: {
        "PAYMENT-RESPONSE": encoded,
        "X-PAYMENT-RESPONSE": encoded,
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function requireX402Payment(
  request: Request,
  quote: X402Quote
): Promise<{ ok: true; txHash: string; payer: string } | { ok: false; response: NextResponse }> {
  const { txHash, payer } = readX402PaymentHeaders(request);
  if (!txHash || !payer) {
    return { ok: false, response: x402PaymentRequired(quote) };
  }

  const verified = await verifyTxPayment(txHash, payer, quote.amountUsdc);
  if (!verified.verified) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          x402Version: 2,
          error: verified.error ?? "Payment verification failed",
          resource: { url: quote.resourceUrl, description: quote.description },
        },
        { status: 402 }
      ),
    };
  }

  return { ok: true, txHash, payer };
}
