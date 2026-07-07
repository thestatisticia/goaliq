export interface KeplrCurrency {
  coinDenom: string;
  coinMinimalDenom: string;
  coinDecimals: number;
  coinGeckoId?: string;
}

export interface KeplrChainInfo {
  chainId: string;
  chainName: string;
  rpc: string;
  rest: string;
  bip44: { coinType: number };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: KeplrCurrency[];
  feeCurrencies: (KeplrCurrency & {
    gasPriceStep?: { low: number; average: number; high: number };
  })[];
  stakeCurrency: KeplrCurrency;
  features?: string[];
}

export interface KeplrKey {
  name: string;
  algo: string;
  pubKey: Uint8Array;
  address: string;
  bech32Address: string;
  isNanoLedger: boolean;
}

export interface Keplr {
  experimentalSuggestChain(chainInfo: KeplrChainInfo): Promise<void>;
  enable(chainId: string): Promise<void>;
  getKey(chainId: string): Promise<KeplrKey>;
  getOfflineSigner(chainId: string): unknown;
  ethereum?: unknown;
}

declare global {
  interface Window {
    keplr?: Keplr;
    ethereum?: unknown;
  }
}

export {};
