"use client";

import { useEffect, useState } from "react";
import { Database, Wallet, Zap } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { dashboardApiUrl } from "@/lib/dashboard-client";

export function StatsBar() {
  const { isConnected, evmAddress, injBalance, usdcBalance } = useWallet();
  const [source, setSource] = useState("loading");
  const [total, setTotal] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    fetch(dashboardApiUrl(), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSource(d.source ?? "api");
        setTotal(d.total ?? null);
        setWarning(d.warning ?? null);
      })
      .catch(() => setSource("error"));
  }, []);

  const sourceLabel =
    source === "football-data"
      ? "football-data.org"
      : source === "api-football"
        ? "API-Football"
        : source === "misconfigured"
          ? "Not configured"
          : source === "fallback"
            ? "Demo data"
            : source;

  return (
    <div className="grid gap-3 sm:grid-cols-3 mb-6">
      <div className="rounded-xl border border-goaliq-borderSubtle bg-goaliq-card p-4 flex items-center gap-3">
        <div className="rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface p-2">
          <Database className="h-5 w-5 text-goaliq-fg" />
        </div>
        <div>
          <p className="text-xs text-goaliq-muted">Data Source</p>
          <p className="font-semibold text-sm text-goaliq-fg">{sourceLabel} · Live</p>
          <p className="text-[10px] text-goaliq-muted">
            {total ?? "—"} WC matches · 48 teams
            {warning ? " · check env vars" : ""}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-goaliq-borderSubtle bg-goaliq-card p-4 flex items-center gap-3">
        <div className="rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface p-2">
          <Zap className="h-5 w-5 text-goaliq-fg" />
        </div>
        <div>
          <p className="text-xs text-goaliq-muted">x402 Premium</p>
          <p className="font-semibold text-sm text-goaliq-fg">from 0.02 USDC / unlock</p>
          <p className="text-[10px] text-goaliq-muted">Injective testnet · balance verified</p>
        </div>
      </div>

      <div className="rounded-xl border border-goaliq-borderSubtle bg-goaliq-card p-4 flex items-center gap-3">
        <div className="rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface p-2">
          <Wallet className="h-5 w-5 text-goaliq-fg" />
        </div>
        <div>
          <p className="text-xs text-goaliq-muted">Wallet</p>
          {isConnected ? (
            <>
              <p className="font-semibold text-sm text-goaliq-fg">{usdcBalance ?? "0"} USDC · {injBalance ?? "0"} INJ</p>
              <p className="text-[10px] text-goaliq-muted font-mono truncate max-w-[180px]">{evmAddress}</p>
            </>
          ) : (
            <p className="text-sm text-goaliq-muted">Connect Keplr →</p>
          )}
        </div>
      </div>
    </div>
  );
}
