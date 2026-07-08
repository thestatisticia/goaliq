"use client";

import { PREMIUM_USDC, getPaymentExplorerUrl } from "@/lib/payments";
import { usePaymentConfig } from "@/context/PaymentConfigContext";
import { ExternalLink } from "lucide-react";

export function PaymentInfo() {
  const { paymentsEnabled, loading } = usePaymentConfig();

  if (loading) {
    return (
      <div className="rounded-lg border border-goaliq-border bg-goaliq-card/50 px-3 py-2 text-[11px] text-gray-500">
        Loading payment config…
      </div>
    );
  }

  if (!paymentsEnabled) {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-[11px] text-yellow-300">
        Premium payments are temporarily unavailable. Add{" "}
        <span className="font-mono">NEXT_PUBLIC_PAYMENT_WALLET</span> (0x address) in Vercel and redeploy.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-goaliq-gold/30 bg-goaliq-gold/5 px-3 py-2 text-[11px] text-gray-300">
      Premium unlocks cost <span className="text-goaliq-gold font-medium">{PREMIUM_USDC} USDC</span> on Injective testnet.
    </div>
  );
}

export function PaymentReceipt({ txHash }: { txHash: string }) {
  return (
    <div className="rounded-lg border border-goaliq-accent/30 bg-goaliq-accent/5 px-3 py-2 text-xs">
      <p className="text-goaliq-accent font-medium">✓ Paid {PREMIUM_USDC} USDC on-chain</p>
      <a
        href={getPaymentExplorerUrl(txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-goaliq-accent hover:underline mt-1"
      >
        View transaction <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
