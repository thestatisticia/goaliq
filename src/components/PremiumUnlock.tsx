"use client";

import { useState } from "react";
import { Lock, Unlock, Loader2, AlertCircle, Coins } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { usePaymentConfig } from "@/context/PaymentConfigContext";
import Link from "next/link";
import { PaymentInfo } from "@/components/PaymentInfo";
import { PREMIUM_USDC } from "@/lib/payments";
import { sendPremiumPayment } from "@/lib/usdc-payment";

interface PremiumUnlockProps {
  matchId: number;
  team1Id?: number;
  team2Id?: number;
  type: "analysis" | "h2h";
}

export function PremiumUnlock({ matchId, team1Id, team2Id, type }: PremiumUnlockProps) {
  const { isConnected, evmAddress, usdcBalance, connect, connecting, refreshBalance } = useWallet();
  const { paymentsEnabled, paymentWallet } = usePaymentConfig();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    if (!isConnected || !evmAddress) {
      await connect();
      return;
    }

    if (!paymentsEnabled || !paymentWallet) {
      setError("Premium payments are not available right now.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const hash = await sendPremiumPayment(evmAddress as `0x${string}`, paymentWallet);

      const verify = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash, from: evmAddress }),
      });
      const v = await verify.json();
      if (!v.verified) throw new Error(v.error ?? "Payment failed");

      setTxHash(hash);
      await refreshBalance();

      const res = await fetch("/api/premium/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, matchId, team1: team1Id, team2: team2Id, evmAddress, txHash: hash }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const title = type === "analysis" ? "Tactical Analysis" : "Head-to-Head History";
  const hasUsdc = usdcBalance && parseFloat(usdcBalance) >= PREMIUM_USDC;

  return (
    <div className="rounded-xl border border-goaliq-gold/30 bg-goaliq-gold/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data ? <Unlock className="h-4 w-4 text-goaliq-gold" /> : <Lock className="h-4 w-4 text-goaliq-gold" />}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className="text-xs text-goaliq-gold">{PREMIUM_USDC} USDC</span>
      </div>

      <PaymentInfo />

      {!isConnected && (
        <p className="text-xs text-gray-400">Connect Keplr to pay with testnet USDC.</p>
      )}

      {isConnected && !hasUsdc && (
        <p className="text-xs text-goaliq-live flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Need USDC. <Link href="/fund" className="text-goaliq-accent underline">Fund wallet</Link>
        </p>
      )}

      {data ? (
        <div className="text-xs bg-black/30 rounded-lg p-3 overflow-auto max-h-96 text-gray-300 whitespace-pre-wrap leading-relaxed">
          {typeof data.report === "string" ? data.report : JSON.stringify(data, null, 2)}
        </div>
      ) : (
        <button
          onClick={unlock}
          disabled={loading || connecting}
          className="w-full rounded-lg bg-goaliq-gold/20 border border-goaliq-gold/40 py-2.5 text-sm font-medium text-goaliq-gold hover:bg-goaliq-gold/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
          {!isConnected ? "Connect & Pay" : hasUsdc ? `Pay ${PREMIUM_USDC} USDC & Unlock` : "Need USDC"}
        </button>
      )}

      {txHash && (
        <p className="text-[10px] text-goaliq-accent font-mono break-all">Tx: {txHash}</p>
      )}
      {error && <p className="text-xs text-goaliq-live">{error}</p>}
    </div>
  );
}
