"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Receipt, Shield, Wallet, Zap } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import {
  getReceiptsForWallet,
  getTotalUsdcSpent,
  type PredictionReceipt,
} from "@/lib/prediction-receipts";
import { INJECTIVE_TESTNET } from "@/lib/constants";
import { truncateAddress } from "@/lib/keplr";

const RECEIPTS_UPDATED = "goaliq-receipts-updated";

export function notifyReceiptsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RECEIPTS_UPDATED));
  }
}

export function InjectiveReceiptPanel() {
  const { evmAddress, isConnected, injBalance, usdcBalance, connect, connecting } = useWallet();
  const [receipts, setReceipts] = useState<PredictionReceipt[]>([]);

  const refresh = useCallback(() => {
    if (!evmAddress) {
      setReceipts([]);
      return;
    }
    setReceipts(getReceiptsForWallet(evmAddress));
  }, [evmAddress]);

  useEffect(() => {
    refresh();
    window.addEventListener(RECEIPTS_UPDATED, refresh);
    return () => window.removeEventListener(RECEIPTS_UPDATED, refresh);
  }, [refresh]);

  const totalSpent = evmAddress ? getTotalUsdcSpent(evmAddress) : 0;
  const x402Count = receipts.filter((r) => r.paidVia === "x402").length;

  return (
    <div className="rounded-2xl border border-goaliq-accent/20 bg-gradient-to-br from-goaliq-card to-goaliq-surface/80 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-goaliq-accent" />
            <h2 className="font-semibold text-goaliq-fg">Injective on-chain portfolio</h2>
          </div>
          <p className="text-xs text-goaliq-muted max-w-md">
            Premium intelligence unlocks settle as USDC on Injective testnet — pay per insight, verified on-chain.
          </p>
        </div>
        <a
          href={INJECTIVE_TESTNET.explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-goaliq-accent hover:underline"
        >
          Injective explorer <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {!isConnected ? (
        <div className="rounded-xl border border-goaliq-borderSubtle bg-goaliq-surface/60 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-goaliq-muted">Connect Keplr to track verified micropayments.</p>
          <button
            onClick={() => connect()}
            disabled={connecting}
            className="inline-flex items-center gap-2 rounded-lg bg-goaliq-accent px-4 py-2 text-sm font-medium text-goaliq-bg hover:bg-sky-300 disabled:opacity-60"
          >
            <Wallet className="h-4 w-4" />
            {connecting ? "Connecting…" : "Connect Keplr"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="USDC spent" value={`${totalSpent.toFixed(2)}`} accent="gold" />
            <StatCard label="Unlocks" value={String(receipts.length)} />
            <StatCard label="x402 paid" value={String(x402Count)} accent="accent" />
            <StatCard
              label="Balance"
              value={`${usdcBalance ?? "0"} USDC`}
              sub={injBalance ? `${injBalance} INJ gas` : undefined}
            />
          </div>

          {evmAddress && (
            <p className="text-[11px] text-goaliq-muted mb-3 font-mono">
              {truncateAddress(evmAddress)} · Injective testnet
            </p>
          )}

          {receipts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-goaliq-borderSubtle bg-goaliq-surface/40 p-4 text-sm text-goaliq-muted">
              No unlocks yet. Ask for match intelligence in the copilot or unlock on a match page —
              each payment gets a verified Injective receipt.
              <Link href="/fund" className="ml-1 text-goaliq-accent hover:underline">
                Fund wallet →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {receipts.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface/80 px-3 py-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-goaliq-fg truncate">
                      {r.homeTeam} vs {r.awayTeam}
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      {r.paidVia === "x402" && (
                        <span className="rounded bg-goaliq-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-goaliq-accent">
                          x402
                        </span>
                      )}
                      <span className="text-goaliq-gold">{r.price}</span>
                    </span>
                  </div>
                  {(r.percentHome || r.percentAway) && (
                    <p className="text-goaliq-muted mt-1">
                      {r.percentHome} · Draw {r.percentDraw ?? "—"} · {r.percentAway}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-goaliq-muted">{new Date(r.createdAt).toLocaleString()}</span>
                    <a
                      href={r.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-goaliq-accent hover:underline shrink-0"
                    >
                      <Zap className="h-3 w-3" /> Tx
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {r.matchId && (
                    <Link href={`/match/${r.matchId}`} className="text-goaliq-accent hover:underline mt-1 inline-block">
                      Match →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="mt-3 flex items-center gap-2 text-[10px] text-goaliq-muted">
        <Receipt className="h-3 w-3" />
        Receipts are wallet-bound · verified against Injective testnet USDC transfers
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "accent";
}) {
  return (
    <div className="rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface/60 px-3 py-2.5 text-center">
      <p
        className={`text-lg font-bold tabular-nums ${
          accent === "gold" ? "text-goaliq-gold" : accent === "accent" ? "text-goaliq-accent" : "text-goaliq-fg"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] text-goaliq-muted">{label}</p>
      {sub && <p className="text-[10px] text-goaliq-muted/80 mt-0.5">{sub}</p>}
    </div>
  );
}
