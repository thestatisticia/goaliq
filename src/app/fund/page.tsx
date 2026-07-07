"use client";

import Link from "next/link";
import { ExternalLink, Droplets, ArrowRightLeft, BookOpen, CheckCircle2 } from "lucide-react";
import { INJECTIVE_TESTNET, CCTP_LINKS, INJECTIVE_DOCS } from "@/lib/constants";
import { useWallet } from "@/context/WalletContext";
import { AddressCopy } from "@/components/AddressCopy";

export default function FundPage() {
  const { isConnected, address, evmAddress, injBalance, usdcBalance, connect, connecting, refreshBalance } =
    useWallet();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Fund Wallet</h1>
        <p className="text-gray-400 text-sm">
          Get testnet USDC on Injective to pay for premium x402 insights — completely free
        </p>
      </div>

      {isConnected && evmAddress ? (
        <div className="rounded-xl border border-goaliq-accent/30 bg-goaliq-accent/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-goaliq-accent" />
              <h2 className="font-semibold">Keplr Connected</h2>
            </div>
            <button
              onClick={refreshBalance}
              className="text-xs text-goaliq-accent hover:underline"
            >
              Refresh balances
            </button>
          </div>

          <div className="rounded-lg border border-goaliq-gold/30 bg-goaliq-gold/5 p-3">
            <p className="text-sm text-goaliq-gold font-medium mb-2">
              For Circle USDC faucet → use your EVM address (0x...)
            </p>
            <p className="text-xs text-gray-400 mb-3">
              The Circle faucet does <strong>not</strong> accept inj... addresses. Copy the 0x address below.
            </p>
            <AddressCopy
              label="EVM address — paste this into faucet.circle.com"
              address={evmAddress}
              highlight
            />
          </div>

          <AddressCopy
            label="Cosmos address (inj...) — use on Injective INJ faucet"
            address={address!}
            hint="Get testnet INJ for gas at testnet.faucet.injective.network"
          />

          <div className="flex gap-4 text-sm">
            {injBalance !== null && (
              <p>
                INJ: <span className="text-goaliq-accent font-semibold">{injBalance}</span>
              </p>
            )}
            {usdcBalance !== null && (
              <p>
                USDC: <span className="text-goaliq-gold font-semibold">{usdcBalance}</span>
              </p>
            )}
          </div>
        </div>
      ) : isConnected ? null : (
        <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-5">
          <p className="text-sm text-gray-400 mb-3">Connect Keplr to see your Injective address here.</p>
          <button
            onClick={connect}
            disabled={connecting}
            className="rounded-lg bg-goaliq-accent px-4 py-2 text-sm font-medium text-black hover:bg-goaliq-accent/90 disabled:opacity-60"
          >
            {connecting ? "Connecting..." : "Connect Keplr"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Droplets className="h-5 w-5 text-goaliq-accent" />
          Step 1: Get Testnet Tokens
        </h2>
        <div className="space-y-3 text-sm">
          <FaucetLink
            href={INJECTIVE_TESTNET.faucet}
            label="Injective Faucet"
            desc="Free testnet INJ (gas) — use inj... or 0x address"
          />
          <FaucetLink
            href={INJECTIVE_TESTNET.circleFaucet}
            label="Circle USDC Faucet"
            desc="Select Injective Testnet — paste your 0x EVM address (not inj...)"
          />
        </div>
      </div>

      <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-goaliq-accent" />
          Step 2: Bridge via CCTP (optional)
        </h2>
        <p className="text-sm text-gray-400">
          Transfer USDC 1:1 from Sepolia (or other supported testnet) to Injective Testnet using
          Circle&apos;s Cross-Chain Transfer Protocol.
        </p>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
          <li>Bridge USDC via CCTP from Sepolia using Keplr on Injective Testnet</li>
          <li>Approve USDC on source chain</li>
          <li>Burn USDC → wait for Circle attestation</li>
          <li>Mint USDC on Injective Testnet</li>
        </ol>
        <DocLink href={CCTP_LINKS.tutorial} label="CCTP Tutorial" />
      </div>

      <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-goaliq-accent" />
          Network Details (Testnet)
        </h2>
        <dl className="text-sm space-y-2">
          <Row label="Chain ID" value={String(INJECTIVE_TESTNET.chainId)} />
          <Row label="RPC" value={INJECTIVE_TESTNET.rpcUrl} mono />
          <Row label="USDC" value={INJECTIVE_TESTNET.usdc} mono />
          <Row label="Explorer" value={INJECTIVE_TESTNET.explorer} />
        </dl>
      </div>

      <div className="rounded-xl border border-goaliq-accent/30 bg-goaliq-accent/5 p-5">
        <h2 className="font-semibold mb-2">Agent Skills Setup</h2>
        <p className="text-sm text-gray-400 mb-3">
          Install Injective Agent Skills for MCP-powered wallet operations in Cursor:
        </p>
        <pre className="text-xs bg-black/40 rounded-lg p-3 overflow-x-auto text-goaliq-accent">
{`npx skills add InjectiveLabs/agent-skills --skill injective-mcp-servers
npx skills add InjectiveLabs/agent-skills --skill injective-usdc-integration`}
        </pre>
        <div className="mt-3 flex gap-3">
          <DocLink href={INJECTIVE_DOCS.mcpServer} label="MCP Server" />
          <DocLink href={INJECTIVE_DOCS.agentSkills} label="Agent Skills" />
        </div>
      </div>
    </div>
  );
}

function FaucetLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg border border-goaliq-border p-3 hover:border-goaliq-accent/50 transition-colors"
    >
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-gray-500 text-xs">{desc}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-gray-500" />
    </a>
  );
}

function DocLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center gap-1 text-sm text-goaliq-accent hover:underline"
    >
      {label} <ExternalLink className="h-3 w-3" />
    </Link>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-gray-300 truncate max-w-[240px]" : "text-gray-300"}>
        {value}
      </dd>
    </div>
  );
}
