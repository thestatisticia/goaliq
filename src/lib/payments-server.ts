import { serverEnv } from "./server-env";

/** Server-side payment wallet — reads Vercel env at request time. */
export function getPaymentWalletServer(): `0x${string}` | null {
  const addr = serverEnv("NEXT_PUBLIC_PAYMENT_WALLET");
  if (!addr?.startsWith("0x") || addr.length !== 42) return null;
  return addr as `0x${string}`;
}

export function isPaymentsEnabledServer(): boolean {
  return getPaymentWalletServer() !== null;
}
