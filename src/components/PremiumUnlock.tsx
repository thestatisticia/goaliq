"use client";

import { useState } from "react";
import { Lock, Unlock, Loader2, AlertCircle, Coins } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { usePaymentConfig } from "@/context/PaymentConfigContext";
import Link from "next/link";
import { PaymentInfo, PaymentReceipt } from "@/components/PaymentInfo";
import { PredictionShareCard } from "@/components/PredictionShareCard";
import { savePredictionReceipt } from "@/lib/prediction-receipts";
import { PRICING } from "@/lib/payments";
import { sendPremiumPayment } from "@/lib/usdc-payment";

interface PremiumUnlockProps {
  matchId: number;
  team1Id?: number;
  team2Id?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  type: "analysis" | "h2h";
}

export function PremiumUnlock({ matchId, team1Id, team2Id, homeTeamName, awayTeamName, type }: PremiumUnlockProps) {
  const { isConnected, evmAddress, usdcBalance, connect, connecting, refreshBalance } = useWallet();
  const { paymentsEnabled, paymentWallet } = usePaymentConfig();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier = type === "analysis" ? PRICING.report : PRICING.insight;
  const price = tier.usdc;

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
      const hash = await sendPremiumPayment(evmAddress as `0x${string}`, paymentWallet, price);

      const verify = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash, from: evmAddress, amount: price }),
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

      const match = json.match as { teams?: { home: { name: string }; away: { name: string } }; league?: { round?: string } } | undefined;
      const pred = json.prediction as {
        percent?: { home: string; away: string; draw: string };
        home?: { name: string };
        away?: { name: string };
      } | null;

      const home = homeTeamName ?? match?.teams?.home?.name ?? pred?.home?.name ?? "Home";
      const away = awayTeamName ?? match?.teams?.away?.name ?? pred?.away?.name ?? "Away";

      savePredictionReceipt({
        matchId,
        homeTeam: home,
        awayTeam: away,
        type,
        txHash: hash,
        evmAddress,
        price: `${price} USDC`,
        percentHome: pred?.percent?.home,
        percentAway: pred?.percent?.away,
        percentDraw: pred?.percent?.draw,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const title = type === "analysis" ? "Tactical Analysis" : "Head-to-Head History";
  const hasUsdc = usdcBalance && parseFloat(usdcBalance) >= price;

  return (
    <div className="rounded-xl border border-goaliq-gold/30 bg-goaliq-gold/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data ? <Unlock className="h-4 w-4 text-goaliq-gold" /> : <Lock className="h-4 w-4 text-goaliq-gold" />}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className="text-xs text-goaliq-gold">{tier.label} · {price} USDC</span>
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
        <div className="space-y-3">
          {(() => {
            const pred = data.prediction as {
              percent?: { home: string; away: string; draw: string };
              home?: { name: string };
              away?: { name: string };
            } | null;
            const match = data.match as { teams?: { home: { name: string }; away: { name: string } }; league?: { round?: string } } | undefined;
            if (pred?.percent && type === "analysis") {
              const home = homeTeamName ?? match?.teams?.home?.name ?? pred.home?.name ?? "Home";
              const away = awayTeamName ?? match?.teams?.away?.name ?? pred.away?.name ?? "Away";
              return (
                <PredictionShareCard
                  homeTeam={home}
                  awayTeam={away}
                  percentHome={pred.percent.home}
                  percentAway={pred.percent.away}
                  percentDraw={pred.percent.draw}
                  round={match?.league?.round}
                />
              );
            }
            return null;
          })()}
          <div className="text-xs bg-black/30 rounded-lg p-3 overflow-auto max-h-96 text-gray-300 whitespace-pre-wrap leading-relaxed">
            {typeof data.report === "string" ? data.report : JSON.stringify(data, null, 2)}
          </div>
        </div>
      ) : (
        <button
          onClick={unlock}
          disabled={loading || connecting}
          className="w-full rounded-lg bg-goaliq-gold/20 border border-goaliq-gold/40 py-2.5 text-sm font-medium text-goaliq-gold hover:bg-goaliq-gold/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
          {!isConnected ? "Connect & Pay" : hasUsdc ? `Pay ${price} USDC & Unlock` : "Need USDC"}
        </button>
      )}

      {txHash && <PaymentReceipt txHash={txHash} />}
      {error && <p className="text-xs text-goaliq-live">{error}</p>}
    </div>
  );
}
