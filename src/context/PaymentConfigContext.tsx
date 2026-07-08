"use client";

import { createContext, useContext, useEffect, useState } from "react";

type PaymentConfigState = {
  paymentWallet: `0x${string}` | null;
  paymentsEnabled: boolean;
  loading: boolean;
};

const PaymentConfigContext = createContext<PaymentConfigState>({
  paymentWallet: null,
  paymentsEnabled: false,
  loading: true,
});

export function PaymentConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PaymentConfigState>({
    paymentWallet: null,
    paymentsEnabled: false,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const wallet =
          typeof data.paymentWallet === "string" && data.paymentWallet.startsWith("0x")
            ? (data.paymentWallet as `0x${string}`)
            : null;
        setState({
          paymentWallet: wallet,
          paymentsEnabled: Boolean(data.paymentsEnabled && wallet),
          loading: false,
        });
      })
      .catch(() => setState({ paymentWallet: null, paymentsEnabled: false, loading: false }));
  }, []);

  return <PaymentConfigContext.Provider value={state}>{children}</PaymentConfigContext.Provider>;
}

export function usePaymentConfig() {
  return useContext(PaymentConfigContext);
}
