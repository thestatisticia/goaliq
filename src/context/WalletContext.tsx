"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { connectKeplr, fetchInjBalance, fetchUsdcBalance, KeplrNotInstalledError } from "@/lib/keplr";
import { getDefaultNetwork, type InjectiveNetwork } from "@/lib/injective-chain";

interface WalletState {
  address: string | null;
  evmAddress: string | null;
  name: string | null;
  chainId: string | null;
  network: InjectiveNetwork;
  injBalance: string | null;
  usdcBalance: string | null;
  connecting: boolean;
  error: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

const STORAGE_KEY = "goaliq-keplr";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [network] = useState<InjectiveNetwork>(getDefaultNetwork());
  const [injBalance, setInjBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!address || !evmAddress) return;
    const [inj, usdc] = await Promise.all([
      fetchInjBalance(address, network),
      fetchUsdcBalance(evmAddress, network),
    ]);
    setInjBalance(inj);
    setUsdcBalance(usdc);
  }, [address, evmAddress, network]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const session = await connectKeplr(network);
      setAddress(session.address);
      setEvmAddress(session.evmAddress);
      setName(session.name);
      setChainId(session.chainId);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ address: session.address, network: session.network })
      );
      const [inj, usdc] = await Promise.all([
        fetchInjBalance(session.address, network),
        fetchUsdcBalance(session.evmAddress, network),
      ]);
      setInjBalance(inj);
      setUsdcBalance(usdc);
    } catch (err) {
      if (err instanceof KeplrNotInstalledError) {
        setError(err.message);
        window.open("https://www.keplr.app/", "_blank");
      } else {
        setError((err as Error).message ?? "Failed to connect Keplr");
      }
    } finally {
      setConnecting(false);
    }
  }, [network]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setEvmAddress(null);
    setName(null);
    setChainId(null);
    setInjBalance(null);
    setUsdcBalance(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Reconnect silently if user connected before
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || !window.keplr) return;

    connect().catch(() => {
      localStorage.removeItem(STORAGE_KEY);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      address,
      evmAddress,
      name,
      chainId,
      network,
      injBalance,
      usdcBalance,
      connecting,
      error,
      isConnected: !!address,
      connect,
      disconnect,
      refreshBalance,
    }),
    [address, evmAddress, name, chainId, network, injBalance, usdcBalance, connecting, error, connect, disconnect, refreshBalance]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
