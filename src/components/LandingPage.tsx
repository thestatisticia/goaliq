"use client";

import Link from "next/link";
import { ArrowRight, Bot, Radio, Zap, Wallet, Check, X } from "lucide-react";
import { PREMIUM_USDC } from "@/lib/payments";

export function LandingPage() {
  return (
    <div className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6">
      <section className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-goaliq-border bg-goaliq-card/60 px-4 py-1.5 text-xs font-medium text-goaliq-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-goaliq-success animate-pulse" />
          Injective Global Cup 2026
        </div>

        <h1 className="mb-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
          World Cup data,
          <br />
          <span className="bg-gradient-to-r from-goaliq-accent via-sky-300 to-goaliq-gold bg-clip-text text-transparent">
            powered by intelligence.
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-goaliq-muted sm:text-xl">
          GOALIQ delivers live FIFA World Cup 2026 scores with an AI copilot. Browse for free — unlock deep match
          analysis for{" "}
          <span className="font-semibold text-goaliq-gold">{PREMIUM_USDC} USDC</span> on Injective testnet.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-goaliq-accent px-8 py-3.5 font-semibold text-goaliq-bg shadow-glow transition-all hover:bg-sky-300 hover:scale-[1.02]"
          >
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/copilot"
            className="inline-flex items-center gap-2 rounded-xl border border-goaliq-border bg-goaliq-card/50 px-8 py-3.5 font-medium transition-colors hover:border-goaliq-accent/40 hover:text-white"
          >
            Try AI Copilot <Bot className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Simple pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <PricingCard
            title="Free"
            price="0 USDC"
            accent="border-goaliq-border"
            items={[
              { ok: true, text: "Live scores & today's fixtures" },
              { ok: true, text: "Results, history & standings" },
              { ok: true, text: "AI chat for schedules & scores" },
              { ok: true, text: "Wallet & Injective guides" },
            ]}
          />
          <PricingCard
            title="Premium"
            price={`${PREMIUM_USDC} USDC / insight`}
            accent="border-goaliq-gold/30"
            highlight
            items={[
              { ok: true, text: "Win probability & team form" },
              { ok: true, text: "Head-to-head analysis" },
              { ok: true, text: "Match page premium unlock" },
              { ok: true, text: "On-chain Keplr payment" },
            ]}
          />
        </div>
      </section>

      <section className="relative border-t border-goaliq-border/50 px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
          <Feature
            icon={<Radio className="h-5 w-5 text-goaliq-live" />}
            title="Live Tournament Data"
            desc="Real-time scores, fixtures, and knockout results from trusted football APIs."
          />
          <Feature
            icon={<Bot className="h-5 w-5 text-goaliq-accent" />}
            title="GOALIQ AI Copilot"
            desc="Ask about today's matches in plain English. Premium stats unlock with a single micropayment."
          />
          <Feature
            icon={<Zap className="h-5 w-5 text-goaliq-gold" />}
            title="x402 Micropayments"
            desc="Pay per insight with testnet USDC on Injective. No subscriptions or accounts."
          />
        </div>
      </section>

      <section className="relative px-4 pb-20">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
          {["x402", "CCTP", "Keplr", "Groq AI", "Injective Testnet"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-goaliq-border bg-goaliq-card/40 px-4 py-1.5 text-xs text-goaliq-muted"
            >
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function PricingCard({
  title,
  price,
  items,
  accent,
  highlight,
}: {
  title: string;
  price: string;
  items: { ok: boolean; text: string }[];
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${accent} bg-goaliq-card/60 p-6 shadow-card ${highlight ? "ring-1 ring-goaliq-gold/20" : ""}`}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className={`mt-1 mb-5 text-2xl font-bold ${highlight ? "text-goaliq-gold" : "text-slate-300"}`}>{price}</p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.text} className="flex items-start gap-2 text-sm text-goaliq-muted">
            {item.ok ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-goaliq-success" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            )}
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-goaliq-border bg-goaliq-card/40 p-6 shadow-card transition-colors hover:border-goaliq-border/80">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-goaliq-muted">{desc}</p>
    </div>
  );
}
