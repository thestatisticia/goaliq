"use client";

import { MIN_PREMIUM_USDC, PREMIUM_USDC, getPaymentExplorerUrl } from "@/lib/payments";
import { usePaymentConfig } from "@/context/PaymentConfigContext";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export function PaymentInfo({ compact }: { compact?: boolean }) {
  const { paymentsEnabled, loading } = usePaymentConfig();

  if (loading) {
    return (
      <div
        className={cn(
          "text-[11px] text-goaliq-muted",
          compact
            ? "rounded-xl border border-goaliq-border/60 bg-goaliq-card/40 px-3 py-2 backdrop-blur-sm"
            : "rounded-lg border border-goaliq-border bg-goaliq-card/50 px-3 py-2"
        )}
      >
        Loading payment config…
      </div>
    );
  }

  if (!paymentsEnabled) {
    return (
      <div
        className={cn(
          "text-[11px] text-goaliq-gold",
          compact
            ? "rounded-xl border border-goaliq-gold/20 bg-goaliq-gold/5 px-3 py-2 backdrop-blur-sm"
            : "rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-yellow-300"
        )}
      >
        Premium payments are temporarily unavailable. Add{" "}
        <span className="font-mono">NEXT_PUBLIC_PAYMENT_WALLET</span> (0x address) in Vercel and redeploy.
      </div>
    );
  }

  if (compact) {
    return (
      <p className="rounded-xl border border-goaliq-border/60 bg-goaliq-card/40 px-3 py-2 text-[11px] text-goaliq-muted backdrop-blur-sm">
        Premium intelligence unlocks from{" "}
        <span className="font-medium text-goaliq-gold">{MIN_PREMIUM_USDC} USDC</span> via Injective x402.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-goaliq-gold/30 bg-goaliq-gold/5 px-3 py-2 text-[11px] text-gray-300">
      Pay only for the intelligence you consume — Injective x402 micropayments from{" "}
      <span className="text-goaliq-gold font-medium">{MIN_PREMIUM_USDC} USDC</span> per unlock. One question. One
      payment. One answer.
    </div>
  );
}

export function PaymentReceipt({
  txHash,
  amountUsdc = PREMIUM_USDC,
  paidVia = "x402",
}: {
  txHash: string;
  amountUsdc?: number;
  paidVia?: "x402" | "usdc";
}) {
  return (
    <div className="rounded-lg border border-goaliq-accent/30 bg-goaliq-accent/5 px-3 py-2 text-xs space-y-1">
      <p className="text-goaliq-accent font-medium">
        ✓ Paid {amountUsdc} USDC on Injective testnet
        {paidVia === "x402" && (
          <span className="ml-2 rounded bg-goaliq-accent/15 px-1.5 py-0.5 text-[10px] font-semibold">x402</span>
        )}
      </p>
      <p className="text-goaliq-muted font-mono text-[10px] truncate">{txHash}</p>
      <a
        href={getPaymentExplorerUrl(txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-goaliq-accent hover:underline"
      >
        View on Injective explorer <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
