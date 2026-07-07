export const WC_LEAGUE_ID = Number(process.env.WC_LEAGUE_ID ?? 1);
export const WC_SEASON = Number(process.env.WC_SEASON ?? 2026);

export const INJECTIVE_TESTNET = {
  chainId: 1439,
  chainIdHex: "0x59f",
  rpcUrl: "https://testnet.sentry.chain.json-rpc.injective.network",
  usdc: "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d" as `0x${string}`,
  network: "eip155:1439",
  explorer: "https://testnet.blockscout.injective.network",
  faucet: "https://testnet.faucet.injective.network",
  circleFaucet: "https://faucet.circle.com",
};

export const INJECTIVE_MAINNET = {
  chainId: 1776,
  chainIdHex: "0x6f0",
  rpcUrl: "https://sentry.evm-rpc.injective.network",
  usdc: "0xa00C59fF5a080D2b954d0c75e46E22a0c371235a" as `0x${string}`,
  network: "eip155:1776",
  explorer: "https://blockscout.injective.network",
};

export const X402_PREMIUM_PRICE = "10000"; // 0.01 USDC (6 decimals)

export const CCTP_LINKS = {
  tutorial: "https://docs.injective.network/developers-defi/usdc-cctp-tutorial",
  usdcDocs: "https://docs.injective.network/developers-defi/usdc-stablecoin",
  tokenMessengerTestnet: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
};

export const INJECTIVE_DOCS = {
  x402: "https://docs.injective.network/developers-ai/x402",
  mcp: "https://docs.injective.network/developers-ai/mcp",
  agentSkills: "https://github.com/InjectiveLabs/agent-skills",
  mcpServer: "https://github.com/InjectiveLabs/mcp-server",
};
