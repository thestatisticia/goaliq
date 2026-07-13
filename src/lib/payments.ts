import { INJECTIVE_TESTNET, X402_PREMIUM_PRICE } from "./constants";
import {
  isSingleMatchAnalysisQuery,
  isUpcomingAnalysisQuery,
  isTournamentForecastQuery,
  isHeadToHeadQuery,
  isTeamFormQuery,
} from "./copilot";

export const PREMIUM_USDC = 0.01;
export const PREMIUM_USDC_RAW = X402_PREMIUM_PRICE; // 10000 = 0.01 USDC (6 decimals)

/** Premium pricing tiers — deeper intelligence costs more. */
export type PricingTierId = "insight" | "report" | "forecast";

export interface PricingTier {
  id: PricingTierId;
  label: string;
  usdc: number;
  blurb: string;
}

export const PRICING: Record<PricingTierId, PricingTier> = {
  insight: {
    id: "insight",
    label: "Match Snapshot",
    usdc: 0.02,
    blurb: "Win chances, team form, and match preview",
  },
  report: {
    id: "report",
    label: "Tactical Intelligence",
    usdc: 0.05,
    blurb: "Full tactical breakdown, strengths/weaknesses, deep H2H",
  },
  forecast: {
    id: "forecast",
    label: "AI World Cup Forecast",
    usdc: 0.1,
    blurb: "Who-wins-it-all projection and multi-match knockout outlook",
  },
};

/** Lowest premium price — used for balance sanity checks. */
export const MIN_PREMIUM_USDC = Math.min(...Object.values(PRICING).map((t) => t.usdc));

/** Pick the pricing tier a premium query belongs to. */
export function getTierForQuery(message: string): PricingTier {
  if (
    /who\s+will\s+win\s+the\s+(world\s+cup|tournament|title)|win\s+the\s+world\s+cup|tournament\s+(forecast|winner|prediction)|predict\s+the\s+(bracket|winner|champion|whole)|lift\s+the\s+trophy|go\s+all\s+the\s+way|reach\s+the\s+final/i.test(
      message
    )
  ) {
    return PRICING.forecast;
  }
  if (
    /tactical|deep\s+analysis|full\s+report|weakness|strength|how\s+could\s+this\s+match\s+unfold|what\s+should\s+each\s+team/i.test(
      message
    )
  ) {
    return PRICING.report;
  }
  // Form + win chances + match preview → Match Snapshot
  return PRICING.insight;
}

/** Wallet that receives all premium USDC payments (set in .env.local) */
export function getPaymentWallet(): `0x${string}` | null {
  const addr = process.env.NEXT_PUBLIC_PAYMENT_WALLET;
  if (!addr || !addr.startsWith("0x") || addr.length !== 42) return null;
  return addr as `0x${string}`;
}

export function isPaymentsEnabled(): boolean {
  return getPaymentWallet() !== null;
}

export function getPaymentExplorerUrl(txHash: string): string {
  return `${INJECTIVE_TESTNET.explorer}/tx/${txHash}`;
}

/** Queries that cost USDC */
export function isPremiumQuery(message: string): boolean {
  // Free: basic head-to-head meetings / scheduled fixture only (no form, no win %)
  if (isHeadToHeadQuery(message)) return false;

  // Free: bulk previews for upcoming fixtures
  if (isUpcomingAnalysisQuery(message)) return false;

  // Premium: team form
  if (isTeamFormQuery(message)) return true;

  // Premium: tournament-winner forecast
  if (isTournamentForecastQuery(message)) return true;

  // Premium: analyze / preview one specific matchup
  if (isSingleMatchAnalysisQuery(message)) return true;

  return /tactical|deep analysis|premium insight|unlock analysis|chances?\s+of|win\s+(chance|chances|probability|odds)|who\s+will\s+win|predict|match\s+preview|preview\s+of|against\s+\w|versus\s+\w|'s\s+(win|match|chance)/i.test(
    message
  );
}

export function formatPaymentReceipt(txHash: string): string {
  return `Paid ${PREMIUM_USDC} USDC on Injective testnet.\nTx: ${getPaymentExplorerUrl(txHash)}`;
}
