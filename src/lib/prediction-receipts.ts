import { getPaymentExplorerUrl, PREMIUM_USDC } from "./payments";

export interface PredictionReceipt {
  id: string;
  matchId: number | null;
  homeTeam: string;
  awayTeam: string;
  type: "analysis" | "h2h" | "compare";
  txHash: string;
  evmAddress: string;
  percentHome?: string;
  percentAway?: string;
  percentDraw?: string;
  price: string;
  createdAt: string;
  explorerUrl: string;
}

const STORAGE_KEY = "goaliq_prediction_receipts";

function readAll(): PredictionReceipt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PredictionReceipt[]) : [];
  } catch {
    return [];
  }
}

function writeAll(receipts: PredictionReceipt[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts.slice(0, 50)));
}

export function savePredictionReceipt(
  input: Omit<PredictionReceipt, "id" | "explorerUrl" | "price" | "createdAt"> & {
    price?: string;
    createdAt?: string;
  }
): PredictionReceipt {
  const receipt: PredictionReceipt = {
    ...input,
    id: `${Date.now()}-${input.txHash.slice(2, 10)}`,
    price: input.price ?? `${PREMIUM_USDC} USDC`,
    createdAt: input.createdAt ?? new Date().toISOString(),
    explorerUrl: getPaymentExplorerUrl(input.txHash),
  };
  const all = [receipt, ...readAll().filter((r) => r.txHash !== receipt.txHash)];
  writeAll(all);
  return receipt;
}

export function getPredictionReceipts(): PredictionReceipt[] {
  return readAll();
}

export function getReceiptsForWallet(evmAddress: string): PredictionReceipt[] {
  const lower = evmAddress.toLowerCase();
  return readAll().filter((r) => r.evmAddress.toLowerCase() === lower);
}
