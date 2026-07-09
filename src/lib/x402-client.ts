"use client";

import { sendPremiumPayment } from "./usdc-payment";

export interface X402FetchResult<T> {
  data: T;
  txHash: string;
  paidVia: "x402";
}

function paymentHeaders(txHash: string, payer: `0x${string}`): HeadersInit {
  return {
    "X-PAYMENT-TX": txHash,
    "X-PAYER-ADDRESS": payer,
  };
}

/**
 * x402 browser flow for Keplr wallets:
 * 1. Request resource → 402 + PAYMENT-REQUIRED quote
 * 2. Pay USDC on Injective testnet via Keplr
 * 3. Retry with X-PAYMENT-TX + X-PAYER-ADDRESS
 */
export async function fetchX402Resource<T>(
  url: string,
  opts: {
    evmAddress: `0x${string}`;
    payTo: `0x${string}`;
    amountUsdc: number;
    init?: RequestInit;
  }
): Promise<X402FetchResult<T>> {
  const init = opts.init ?? { method: "GET" };
  const first = await fetch(url, { ...init, cache: "no-store" });

  if (first.status !== 402) {
    if (!first.ok) {
      const err = await first.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? `Request failed (${first.status})`);
    }
    const data = (await first.json()) as T;
    const tx = first.headers.get("PAYMENT-RESPONSE");
    return {
      data,
      txHash: tx ? parseTxFromReceipt(tx) : "already-paid",
      paidVia: "x402",
    };
  }

  const quote = await first.json().catch(() => null);
  const quotedAmount = quote?.accepts?.[0]?.amount
    ? Number(quote.accepts[0].amount) / 1_000_000
    : opts.amountUsdc;

  const txHash = await sendPremiumPayment(opts.evmAddress, opts.payTo, quotedAmount);

  const retry = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...paymentHeaders(txHash, opts.evmAddress),
    },
    cache: "no-store",
  });

  if (!retry.ok) {
    const err = await retry.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `x402 unlock failed (${retry.status})`);
  }

  const data = (await retry.json()) as T;
  return { data, txHash, paidVia: "x402" };
}

function parseTxFromReceipt(header: string): string {
  try {
    const json = JSON.parse(atob(header)) as { transaction?: string };
    return json.transaction ?? "";
  } catch {
    return "";
  }
}

export function x402PremiumUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/x402${path}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/x402${path}`;
}
