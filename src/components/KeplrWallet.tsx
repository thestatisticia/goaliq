"use client";

import { useState } from "react";
import { Wallet, LogOut, Loader2, RefreshCw } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { truncateAddress } from "@/lib/keplr";
import { cn } from "@/lib/utils";
import { AddressCopy } from "@/components/AddressCopy";

export function KeplrWallet() {
  const { address, evmAddress, injBalance, usdcBalance, connecting, error, isConnected, connect, disconnect, refreshBalance } =
    useWallet();
  const [open, setOpen] = useState(false);

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={connect}
          disabled={connecting}
          className="flex items-center gap-1.5 rounded-lg bg-goaliq-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{connecting ? "Connecting..." : "Connect Keplr"}</span>
        </button>
        {error && (
          <p className="absolute right-0 top-full mt-1 w-48 text-[10px] text-goaliq-live text-right">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-goaliq-accent/40 bg-goaliq-accent/10 px-3 py-2 text-sm hover:bg-goaliq-accent/20 transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-goaliq-accent" />
        <span className="font-mono text-xs">{truncateAddress(evmAddress ?? address!)}</span>
        {usdcBalance !== null && (
          <span className="hidden md:inline text-goaliq-gold text-xs">{usdcBalance} USDC</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-goaliq-border bg-goaliq-card p-3 shadow-xl">
            <p className="text-xs text-gray-500 mb-2">Keplr · Injective Testnet</p>
            {evmAddress && (
              <AddressCopy
                label="EVM address (use for Circle USDC faucet)"
                address={evmAddress}
                highlight
                className="mb-2"
              />
            )}
            <AddressCopy label="Cosmos address (inj...)" address={address!} className="mb-3" />
            <div className="flex gap-3 text-sm mb-3">
              {injBalance !== null && (
                <span>
                  <span className="text-gray-500">INJ:</span>{" "}
                  <span className="text-goaliq-accent font-semibold">{injBalance}</span>
                </span>
              )}
              {usdcBalance !== null && (
                <span>
                  <span className="text-gray-500">USDC:</span>{" "}
                  <span className="text-goaliq-gold font-semibold">{usdcBalance}</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => refreshBalance()}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 rounded-lg border border-goaliq-border py-1.5 text-xs",
                  "hover:border-goaliq-accent/50 transition-colors"
                )}
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
              <button
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-goaliq-live/40 text-goaliq-live py-1.5 text-xs hover:bg-goaliq-live/10 transition-colors"
              >
                <LogOut className="h-3 w-3" /> Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
