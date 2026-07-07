import type { KeplrChainInfo } from "@/types/keplr";

export type InjectiveNetwork = "testnet" | "mainnet";

const INJ_CURRENCY = {
  coinDenom: "INJ",
  coinMinimalDenom: "inj",
  coinDecimals: 18,
  coinGeckoId: "injective-protocol",
};

const BECH32 = {
  bech32PrefixAccAddr: "inj",
  bech32PrefixAccPub: "injpub",
  bech32PrefixValAddr: "injvaloper",
  bech32PrefixValPub: "injvaloperpub",
  bech32PrefixConsAddr: "injvalcons",
  bech32PrefixConsPub: "injvalconspub",
};

export const INJECTIVE_CHAINS: Record<InjectiveNetwork, KeplrChainInfo & { chainId: string }> = {
  testnet: {
    chainId: "injective-888",
    chainName: "Injective Testnet",
    rpc: "https://testnet.sentry.tm.injective.network:443",
    rest: "https://testnet.sentry.lcd.injective.network",
    bip44: { coinType: 60 },
    bech32Config: BECH32,
    currencies: [INJ_CURRENCY],
    feeCurrencies: [
      {
        ...INJ_CURRENCY,
        gasPriceStep: { low: 500000000, average: 700000000, high: 900000000 },
      },
    ],
    stakeCurrency: INJ_CURRENCY,
    features: ["cosmwasm", "eth-address-gen", "eth-key-sign"],
  },
  mainnet: {
    chainId: "injective-1",
    chainName: "Injective",
    rpc: "https://sentry.tm.injective.network:443",
    rest: "https://sentry.lcd.injective.network",
    bip44: { coinType: 60 },
    bech32Config: BECH32,
    currencies: [INJ_CURRENCY],
    feeCurrencies: [
      {
        ...INJ_CURRENCY,
        gasPriceStep: { low: 500000000, average: 700000000, high: 900000000 },
      },
    ],
    stakeCurrency: INJ_CURRENCY,
    features: ["cosmwasm", "eth-address-gen", "eth-key-sign"],
  },
};

export function getDefaultNetwork(): InjectiveNetwork {
  const env = process.env.NEXT_PUBLIC_INJECTIVE_NETWORK ?? "testnet";
  return env === "mainnet" ? "mainnet" : "testnet";
}
