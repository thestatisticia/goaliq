"use client";

import { useEffect, useState } from "react";
import { Database, Wallet, Zap } from "lucide-react";
import { useWallet } from "@/context/WalletContext";

export function StatsBar() {
  const { isConnected, evmAddress, injBalance, usdcBalance } = useWallet();
  const [source, setSource] = useState("loading");
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setSource(d.source ?? "api");
        setTotal(d.total ?? null);
      })
      .catch(() => setSource("error"));
  }, []);

  const sourceLabel =
    source === "football-data" ? "football-data.org" : source === "api-football" ? "API-Football" : source;

  return (
    <div className="grid gap-3 sm:grid-cols-3 mb-6">
      <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-4 flex items-center gap-3">
        <div className="rounded-lg bg-goaliq-accent/20 p-2">
          <Database className="h-5 w-5 text-goaliq-accent" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Data Source</p>
          <p className="font-semibold text-sm">{sourceLabel} · Live</p>
          <p className="text-[10px] text-gray-600">{total ?? "—"} WC matches · 48 teams</p>
        </div>
      </div>

      <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-4 flex items-center gap-3">
        <div className="rounded-lg bg-goaliq-gold/20 p-2">
          <Zap className="h-5 w-5 text-goaliq-gold" />
        </div>
        <div>
          <p className="text-xs text-gray-500">x402 Premium</p>
          <p className="font-semibold text-sm">0.01 USDC / unlock</p>
          <p className="text-[10px] text-gray-600">Injective testnet · balance verified</p>
        </div>
      </div>

      <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-4 flex items-center gap-3">
        <div className="rounded-lg bg-blue-500/20 p-2">
          <Wallet className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Wallet</p>
          {isConnected ? (
            <>
              <p className="font-semibold text-sm">{usdcBalance ?? "0"} USDC · {injBalance ?? "0"} INJ</p>
              <p className="text-[10px] text-gray-600 font-mono truncate max-w-[180px]">{evmAddress}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Connect Keplr →</p>
          )}
        </div>
      </div>
    </div>
  );
}
