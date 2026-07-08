"use client";

import { createWalletClient, createPublicClient, custom, http, parseUnits, type Hash } from "viem";
import { INJECTIVE_TESTNET } from "./constants";
import { PREMIUM_USDC } from "./payments";

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

const injectiveTestnetChain = {
  id: INJECTIVE_TESTNET.chainId,
  name: "Injective Testnet",
  nativeCurrency: { name: "INJ", symbol: "INJ", decimals: 18 },
  rpcUrls: { default: { http: [INJECTIVE_TESTNET.rpcUrl] } },
} as const;

function getEthereumProvider(): unknown {
  if (typeof window === "undefined") return null;
  // Keplr only — never fall back to window.ethereum (MetaMask) on Injective
  return window.keplr?.ethereum ?? null;
}

/** Send testnet USDC to the configured payment wallet via Keplr (Injective EVM) */
export async function sendPremiumPayment(
  fromAddress: `0x${string}`,
  payTo: `0x${string}`,
  amountUsdc: number = PREMIUM_USDC
): Promise<Hash> {
  if (!payTo) {
    throw new Error("Premium payments are not available right now.");
  }

  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("Connect Keplr first — GOALIQ uses Keplr on Injective Testnet, not MetaMask.");
  }

  // Request chain switch to Injective testnet EVM (Keplr)
  try {
    await (provider as { request: (args: unknown) => Promise<unknown> }).request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: INJECTIVE_TESTNET.chainIdHex }],
    });
  } catch (switchErr) {
    try {
      await (provider as { request: (args: unknown) => Promise<unknown> }).request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: INJECTIVE_TESTNET.chainIdHex,
            chainName: "Injective Testnet",
            nativeCurrency: { name: "INJ", symbol: "INJ", decimals: 18 },
            rpcUrls: [INJECTIVE_TESTNET.rpcUrl],
            blockExplorerUrls: [INJECTIVE_TESTNET.explorer],
          },
        ],
      });
    } catch {
      throw new Error(
        "Could not switch Keplr to Injective Testnet. Open Keplr → enable Injective Testnet, then retry."
      );
    }
  }

  const client = createWalletClient({
    chain: injectiveTestnetChain,
    transport: custom(provider as Parameters<typeof custom>[0]),
    account: fromAddress,
  });

  const publicClient = createPublicClient({
    chain: injectiveTestnetChain,
    transport: http(INJECTIVE_TESTNET.rpcUrl),
  });

  const hash = await client.writeContract({
    address: INJECTIVE_TESTNET.usdc,
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [payTo, parseUnits(String(amountUsdc), 6)],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
