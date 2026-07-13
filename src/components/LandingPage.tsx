"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
} from "lucide-react";
import { MIN_PREMIUM_USDC, PRICING } from "@/lib/payments";
import { LandingLiveTicker } from "@/components/LandingLiveTicker";
import { HeroMockup } from "@/components/HeroMockup";
import { GoaliqWordmark } from "@/components/GoaliqWordmark";

export function LandingPage() {
  return (
    <div className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6">
      <LandingLiveTicker />

      {/* Hero — untouched layout & font */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 font-hero sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-goaliq-borderSubtle bg-goaliq-surface px-4 py-1.5 text-xs font-medium text-goaliq-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-goaliq-success animate-pulse" />
              Injective Global Cup 2026
            </div>

            <h1 className="mb-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Football Intelligence,{" "}
              <span className="bg-gradient-to-r from-goaliq-accent to-goaliq-gold bg-clip-text text-transparent">
                On Demand.
              </span>
            </h1>

            <p className="mb-8 max-w-lg text-lg leading-relaxed text-goaliq-muted">
              Live World Cup coverage for everyone. Premium AI insights unlocked instantly through{" "}
              <span className="text-goaliq-fg">Injective micropayments</span> — no subscription.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-goaliq-accent px-7 py-3.5 font-semibold text-goaliq-bg shadow-glow transition-all hover:bg-sky-300 hover:scale-[1.02]"
              >
                Explore live matches <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/copilot"
                className="inline-flex items-center gap-2 rounded-xl border border-goaliq-borderSubtle bg-goaliq-card px-7 py-3.5 font-medium transition-colors hover:border-goaliq-accent/30"
              >
                Ask GOALIQ AI <Bot className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-goaliq-borderSubtle bg-goaliq-surface/40 py-10 font-sans">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6">
          <Stat value="48" label="World Cup teams" />
          <Stat value="104" label="Tournament matches" />
          <Stat value={`${MIN_PREMIUM_USDC}+`} label="USDC per insight" />
          <Stat value="Live" label="Score updates" accent />
        </div>
      </section>

      {/* Problem & solution */}
      <section className="mx-auto max-w-5xl px-4 py-16 font-sans sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-goaliq-muted">The problem</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-goaliq-fg sm:text-3xl">
              Fans juggle apps. Subscriptions charge monthly for one answer.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-goaliq-muted">
              Scores in one app, stats in another, predictions behind a paywall — even when you only need a single
              insight before kickoff.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-goaliq-muted">Our solution</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-goaliq-fg sm:text-3xl">
              One intelligence platform. Pay per insight.
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-goaliq-muted">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-goaliq-success" />
                Live World Cup data — always free
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-goaliq-success" />
                AI football assistant grounded in real fixtures
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-goaliq-success" />
                Premium intelligence via Injective x402 — cents, not subscriptions
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section className="mx-auto max-w-6xl px-4 py-20 font-sans sm:px-6">
        <div className="mb-14 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-goaliq-muted">The platform</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-goaliq-fg sm:text-4xl">
            Free coverage. Premium intelligence on demand.
          </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          <ProductPanel
            title="Dashboard"
            href="/dashboard"
            bullets={["Live scores", "Today's fixtures", "Knockout bracket", "Full results"]}
          >
            <div className="space-y-2">
              <MockTabRow tabs={["Live", "Today", "Results", "Upcoming"]} active={0} />
              <MockMatch home="France" away="Morocco" time="Today · 20:00 UTC" />
              <MockMatch home="Spain" away="Belgium" time="Fri · 19:00 UTC" />
            </div>
          </ProductPanel>

          <ProductPanel
            title="AI Copilot"
            href="/copilot"
            bullets={["Today's schedule", "Team outcomes", "Unlock football intelligence", "Wallet help"]}
          >
            <div className="space-y-2 text-sm">
              <MockChat role="user" text="What matches are today?" />
              <MockChat
                role="assistant"
                text="France vs Morocco kicks off at 20:00 UTC — full list on the dashboard."
              />
              <MockChat role="user" text="Win chances for Switzerland?" />
              <MockChat role="assistant" text={`Match Snapshot · ${PRICING.insight.usdc} USDC via Keplr`} muted />
            </div>
          </ProductPanel>

          <ProductPanel
            title="Premium intelligence"
            href="/copilot"
            bullets={["Win probability", "Tactical breakdown", "Head-to-head", "Instant x402 unlock"]}
          >
            <PremiumPreview />
          </ProductPanel>
        </div>
      </section>

      {/* Payment flow */}
      <section className="border-t border-goaliq-borderSubtle bg-goaliq-surface/30 py-20 font-sans">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-12 max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-goaliq-muted">Pay per insight</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-goaliq-fg">
              One question. One payment. One answer.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-goaliq-muted">
              Instead of subscriptions, GOALIQ charges only for the intelligence you consume — powered by Injective x402.
            </p>
          </div>
          <ol className="grid gap-0 sm:grid-cols-4">
            <FlowStep step={1} title="Ask" desc="Request match intelligence or win chances" />
            <FlowStep step={2} title="Quote" desc="GOALIQ picks the right tier" />
            <FlowStep step={3} title="Pay" desc={`From ${MIN_PREMIUM_USDC} USDC in Keplr`} />
            <FlowStep step={4} title="Unlock" desc="Premium intelligence instantly" last />
          </ol>
        </div>
      </section>

      {/* Why GOALIQ — editorial, not icon grid */}
      <section className="mx-auto max-w-5xl px-4 py-20 font-sans sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-goaliq-muted">Why GOALIQ</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-snug tracking-tight text-goaliq-fg sm:text-4xl">
              Smarter football starts here
            </h2>
            <p className="mt-4 text-base leading-relaxed text-goaliq-muted">
              GOALIQ helps fans understand the tournament — not just watch it. Real data, conversational AI, and
              on-demand intelligence unlocked through Injective.
            </p>
          </div>
          <ul className="divide-y divide-goaliq-borderSubtle border-t border-goaliq-borderSubtle">
            <WhyRow title="Free live coverage" desc="Scores, fixtures, bracket, and results from football-data.org." />
            <WhyRow title="Grounded AI copilot" desc="Answers tied to live fixture data — schedules, outcomes, bracket state." />
            <WhyRow title="Pay per insight" desc="No accounts or subscriptions. Unlock only the intelligence you need." />
            <WhyRow title="Injective x402" desc="Enables a new model: ask once, pay cents, get verified on-chain receipts." />
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-4 pb-8 font-sans sm:px-6">
        <h2 className="mb-10 font-display text-3xl font-semibold tracking-tight text-goaliq-fg">Pricing</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <PricingCard
            title="Free"
            price="0 USDC"
            items={["Live scores & fixtures", "Results & knockout", "AI chat for schedules", "Wallet & funding guides"]}
          />
          <PricingCard
            title="Premium intelligence"
            price={`from ${MIN_PREMIUM_USDC} USDC`}
            highlight
            items={[
              `Match Snapshot · ${PRICING.insight.usdc} USDC`,
              `Tactical Intelligence · ${PRICING.report.usdc} USDC`,
              `AI World Cup Forecast · ${PRICING.forecast.usdc} USDC`,
              "Instant Injective x402 unlock",
            ]}
          />
        </div>
      </section>

      {/* Powered by */}
      <section className="border-t border-goaliq-borderSubtle py-12 font-sans">
        <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.25em] text-goaliq-muted">
          Built for the Injective Global Cup
        </p>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 px-4">
          {["Injective", "Keplr", "Groq AI", "football-data.org", "x402", "Next.js"].map((name) => (
            <span
              key={name}
              className="rounded-md border border-goaliq-border bg-goaliq-card px-4 py-2 text-sm text-goaliq-muted"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 font-sans sm:px-6">
        <div className="rounded-2xl border border-goaliq-borderSubtle bg-goaliq-card px-6 py-12 text-center sm:px-10">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-goaliq-fg sm:text-4xl">
            Every match. Every insight. Instantly.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-goaliq-muted">
            Live football data stays free. Premium AI intelligence unlocks when it matters — powered by Injective x402.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-goaliq-accent px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-goaliq-accentDim"
          >
            Open dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function PremiumPreview() {
  return (
    <div className="rounded-lg border border-goaliq-border bg-goaliq-surface/80 p-3 text-xs">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-goaliq-gold">Match intelligence</p>
      <p className="mb-3 text-sm font-medium text-goaliq-fg">France vs Morocco</p>
      <div className="space-y-2 text-goaliq-muted">
        <div className="flex justify-between">
          <span>France win</span>
          <span className="font-medium text-goaliq-fg">52%</span>
        </div>
        <div className="h-1 rounded-full bg-goaliq-border overflow-hidden">
          <div className="h-full w-[52%] rounded-full bg-goaliq-accent" />
        </div>
        <div className="flex justify-between">
          <span>Draw</span>
          <span className="text-goaliq-fg">22%</span>
        </div>
        <div className="flex justify-between">
          <span>Morocco win</span>
          <span className="text-goaliq-fg">26%</span>
        </div>
        <p className="pt-2 border-t border-goaliq-border text-[11px]">
          Form · FRA WWDLW · MAR WLDWW
        </p>
      </div>
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={`font-display text-2xl font-semibold tabular-nums sm:text-3xl ${accent ? "text-goaliq-live" : "text-goaliq-fg"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-goaliq-muted sm:text-sm">{label}</p>
    </div>
  );
}

function ProductPanel({
  title,
  href,
  bullets,
  children,
}: {
  title: string;
  href: string;
  bullets: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col border-t border-goaliq-borderSubtle pt-6">
      <h3 className="font-display text-xl font-semibold text-goaliq-fg">{title}</h3>
      <div className="my-5 flex-1 rounded-lg border border-goaliq-border bg-goaliq-bg/60 p-3">{children}</div>
      <ul className="mb-5 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-goaliq-muted">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-goaliq-success" />
            {b}
          </li>
        ))}
      </ul>
      <Link href={href} className="text-sm font-medium text-goaliq-accent hover:underline">
        Open {title} →
      </Link>
    </div>
  );
}

function FlowStep({
  step,
  title,
  desc,
  last,
}: {
  step: number;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <li className={`relative pb-8 sm:pb-0 ${last ? "" : "sm:border-r sm:border-goaliq-borderSubtle sm:pr-4"}`}>
      <span className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-goaliq-border text-xs font-semibold text-goaliq-muted">
        {step}
      </span>
      <h3 className="text-sm font-semibold text-goaliq-fg">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-goaliq-muted">{desc}</p>
    </li>
  );
}

function WhyRow({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="py-5">
      <h3 className="text-sm font-semibold text-goaliq-fg">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-goaliq-muted">{desc}</p>
    </li>
  );
}

function MockTabRow({ tabs, active }: { tabs: string[]; active: number }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map((t, i) => (
        <span
          key={t}
          className={`rounded px-2 py-0.5 text-[10px] ${i === active ? "bg-goaliq-accent/20 text-goaliq-accent" : "text-goaliq-muted"}`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function MockMatch({
  home,
  away,
  score,
  minute,
  time,
  live,
}: {
  home: string;
  away: string;
  score?: string;
  minute?: string;
  time?: string;
  live?: boolean;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${live ? "border-goaliq-live/30 bg-goaliq-live/5" : "border-goaliq-border bg-goaliq-surface/60"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-goaliq-fg/90">
          {home} {score ?? time} {away}
        </span>
        {minute && (
          <span className={`shrink-0 text-[10px] ${live ? "text-goaliq-live font-semibold" : "text-goaliq-muted"}`}>
            {minute}
          </span>
        )}
      </div>
    </div>
  );
}

function MockChat({
  role,
  text,
  muted,
}: {
  role: "user" | "assistant";
  text: string;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-md px-2.5 py-1.5 ${role === "user" ? "bg-goaliq-accent/12 text-goaliq-accent ml-4" : "bg-goaliq-surface text-goaliq-fg/85 mr-4"}`}>
      <p className={`text-xs leading-relaxed ${muted ? "text-goaliq-muted italic" : ""}`}>{text}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  items,
  highlight,
}: {
  title: string;
  price: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${highlight ? "border-goaliq-gold/40 bg-goaliq-card" : "border-goaliq-border bg-goaliq-card/80"}`}
    >
      <h3 className="font-display text-lg font-semibold text-goaliq-fg">{title}</h3>
      <p className={`mt-1 mb-5 text-2xl font-semibold tabular-nums ${highlight ? "text-goaliq-gold" : "text-goaliq-fg"}`}>
        {price}
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-goaliq-muted">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-goaliq-success" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
