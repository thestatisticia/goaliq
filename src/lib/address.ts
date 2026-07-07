import { fromBech32 } from "@cosmjs/encoding";

/** Convert inj1... bech32 address to 0x... EVM address (same wallet on Injective). */
export function getEthereumAddress(address: string): string {
  if (address.startsWith("0x")) {
    return address.toLowerCase();
  }
  const { data } = fromBech32(address);
  const hex = Buffer.from(data.slice(-20)).toString("hex");
  return `0x${hex}`;
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidInjAddress(address: string): boolean {
  return address.startsWith("inj1") && address.length >= 39;
}
