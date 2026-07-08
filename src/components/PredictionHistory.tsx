"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Receipt, Shield } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { getReceiptsForWallet, type PredictionReceipt } from "@/lib/prediction-receipts";

export function PredictionHistory() {
  const { evmAddress, isConnected } = useWallet();
  const [receipts, setReceipts] = useState<PredictionReceipt[]>([]);

  useEffect(() => {
    if (!evmAddress) {
      setReceipts([]);
      return;
    }
    setReceipts(getReceiptsForWallet(evmAddress));
  }, [evmAddress]);

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-goaliq-border bg-goaliq-card/40 p-4 text-sm text-goaliq-muted">
        Connect Keplr to see your on-chain prediction receipts.
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="rounded-xl border border-goaliq-border bg-goaliq-card/40 p-4 text-sm text-goaliq-muted">
        No premium predictions yet — unlock analysis on a match page to get a verified Injective receipt.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-goaliq-border bg-goaliq-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-goaliq-gold" />
        <h2 className="font-semibold text-sm">Your prediction receipts</h2>
        <span className="text-xs text-goaliq-muted">({receipts.length})</span>
      </div>

      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {receipts.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-goaliq-border/60 bg-black/20 px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-white">
                {r.homeTeam} vs {r.awayTeam}
              </span>
              <span className="text-goaliq-gold shrink-0">{r.price}</span>
            </div>
            {(r.percentHome || r.percentAway) && (
              <p className="text-goaliq-muted mt-1">
                {r.percentHome} · Draw {r.percentDraw ?? "—"} · {r.percentAway}
              </p>
            )}
            <div className="flex items-center justify-between mt-2 gap-2">
              <span className="text-goaliq-muted">
                {new Date(r.createdAt).toLocaleString()}
              </span>
              <a
                href={r.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-goaliq-accent hover:underline"
              >
                <Shield className="h-3 w-3" /> Verified on Injective
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {r.matchId && (
              <Link href={`/match/${r.matchId}`} className="text-goaliq-accent hover:underline mt-1 inline-block">
                View match →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
