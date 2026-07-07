import { getDefaultNetwork, INJECTIVE_CHAINS, type InjectiveNetwork } from "./injective-chain";
import { INJECTIVE_TESTNET } from "./constants";
import { getEthereumAddress } from "./address";
import type { Keplr } from "@/types/keplr";

export class KeplrNotInstalledError extends Error {
  constructor() {
    super("Keplr wallet extension not found. Install it from https://www.keplr.app/");
    this.name = "KeplrNotInstalledError";
  }
}

export function getKeplr(): Keplr {
  if (typeof window === "undefined" || !window.keplr) {
    throw new KeplrNotInstalledError();
  }
  return window.keplr;
}

export async function connectKeplr(network: InjectiveNetwork = getDefaultNetwork()) {
  const keplr = getKeplr();
  const chain = INJECTIVE_CHAINS[network];

  await keplr.experimentalSuggestChain(chain);
  await keplr.enable(chain.chainId);
  const key = await keplr.getKey(chain.chainId);
  const evmAddress = getEthereumAddress(key.bech32Address);

  return {
    address: key.bech32Address,
    evmAddress,
    name: key.name,
    chainId: chain.chainId,
    network,
  };
}

export async function fetchUsdcBalance(
  evmAddress: string,
  network: InjectiveNetwork = getDefaultNetwork()
): Promise<string | null> {
  const usdc =
    network === "testnet" ? INJECTIVE_TESTNET.usdc : "0xa00C59fF5a080D2b954d0c75e46E22a0c371235a";
  const rpc =
    network === "testnet"
      ? INJECTIVE_TESTNET.rpcUrl
      : "https://sentry.evm-rpc.injective.network";

  // balanceOf(address) selector = 0x70a08231
  const padded = evmAddress.slice(2).toLowerCase().padStart(64, "0");
  const data = `0x70a08231${padded}`;

  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: usdc, data }, "latest"],
      }),
    });
    const json = await res.json();
    if (!json.result || json.result === "0x") return "0";
    const raw = BigInt(json.result);
    return (Number(raw) / 1e6).toFixed(2);
  } catch {
    return null;
  }
}

export async function fetchInjBalance(
  address: string,
  network: InjectiveNetwork = getDefaultNetwork()
): Promise<string | null> {
  const rest = INJECTIVE_CHAINS[network].rest;
  try {
    const res = await fetch(`${rest}/cosmos/bank/v1beta1/balances/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    const inj = data.balances?.find((b: { denom: string }) => b.denom === "inj");
    if (!inj) return "0";
    const amount = Number(inj.amount) / 1e18;
    return amount.toFixed(4);
  } catch {
    return null;
  }
}

export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
