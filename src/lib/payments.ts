import { INJECTIVE_TESTNET, X402_PREMIUM_PRICE } from "./constants";

export const PREMIUM_USDC = 0.01;
export const PREMIUM_USDC_RAW = X402_PREMIUM_PRICE; // 10000 = 0.01 USDC (6 decimals)

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
  // Free: previews for multiple upcoming matches (form from live data)
  if (
    /\b(analys[ei]s|preview|breakdown|outlook)\b/i.test(message) &&
    /\b(next|upcoming)\b/i.test(message) &&
    /\bmatch/i.test(message)
  ) {
    return false;
  }

  return /head[\s-]?to[\s-]?head|h2h|tactical|deep analysis|premium insight|unlock analysis|chances?\s+of|win\s+(chance|chances|probability|odds)|who\s+will\s+win|predict|match\s+preview|preview\s+of|against\s+\w|versus\s+\w|'s\s+(win|match|chance)/i.test(
    message
  );
}

export function formatPaymentReceipt(txHash: string): string {
  return `Paid ${PREMIUM_USDC} USDC on Injective testnet.\nTx: ${getPaymentExplorerUrl(txHash)}`;
}
