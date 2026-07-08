"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Radio,
  Zap,
  Check,
  LayoutDashboard,
  MessageSquare,
  Wallet,
  Sparkles,
  BarChart3,
  Shield,
} from "lucide-react";
import { PREMIUM_USDC } from "@/lib/payments";
import { LandingLiveTicker } from "@/components/LandingLiveTicker";
import { GoaliqWordmark } from "@/components/GoaliqWordmark";

export function LandingPage() {
  return (
    <div className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6">
      <LandingLiveTicker />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-goaliq-border bg-goaliq-card/60 px-4 py-1.5 text-xs font-medium text-goaliq-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-goaliq-success animate-pulse" />
              Injective Global Cup 2026
            </div>

            <h1 className="mb-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              The smartest way to follow the{" "}
              <span className="bg-gradient-to-r from-goaliq-accent to-goaliq-gold bg-clip-text text-transparent">
                FIFA World Cup
              </span>
            </h1>

            <p className="mb-8 max-w-lg text-lg leading-relaxed text-goaliq-muted">
              Live scores, an AI copilot that speaks football, and premium match insights unlocked instantly with{" "}
              <span className="text-white">Injective USDC</span> — no subscription.
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
                className="inline-flex items-center gap-2 rounded-xl border border-goaliq-border bg-goaliq-card/50 px-7 py-3.5 font-medium transition-colors hover:border-goaliq-accent/40"
              >
                Try AI Copilot <Bot className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-goaliq-border/50 bg-goaliq-card/20 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          <Stat value="48" label="World Cup teams" />
          <Stat value="104" label="Tournament matches" />
          <Stat value={`${PREMIUM_USDC}`} label="USDC per insight" />
          <Stat value="Live" label="Score updates" accent />
        </div>
      </section>

      {/* Product preview */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">See the product</h2>
          <p className="mt-2 text-goaliq-muted">Three surfaces. One tournament hub.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <ProductPanel
            icon={<LayoutDashboard className="h-5 w-5 text-goaliq-accent" />}
            title="Dashboard"
            href="/dashboard"
            bullets={["Live scores", "Today's fixtures", "Knockout bracket", "Full results"]}
          >
            <div className="space-y-2">
              <MockTabRow tabs={["Live", "Today", "Results", "Upcoming"]} active={0} />
              <MockMatch live home="Switzerland" away="Colombia" score="1–1" minute="Pens" />
              <MockMatch home="France" away="Morocco" time="Today 20:00" />
            </div>
          </ProductPanel>

          <ProductPanel
            icon={<MessageSquare className="h-5 w-5 text-goaliq-accent" />}
            title="AI Copilot"
            href="/copilot"
            bullets={["Today's schedule", "Team outcomes", "Win chances (premium)", "Wallet help"]}
          >
            <div className="space-y-2 text-sm">
              <MockChat role="user" text="What matches are today?" />
              <MockChat
                role="assistant"
                text="Hey ninja! France vs Morocco kicks off at 20:00 UTC — check the Upcoming tab for the full list."
              />
              <MockChat role="user" text="Win chances for Switzerland?" />
              <MockChat role="assistant" text={`Premium insight · ${PREMIUM_USDC} USDC via Keplr`} muted />
            </div>
          </ProductPanel>

          <ProductPanel
            icon={<BarChart3 className="h-5 w-5 text-goaliq-gold" />}
            title="Premium reports"
            href="/copilot"
            bullets={["Win probability", "Team form", "Head-to-head", "On-chain unlock"]}
          >
            <PremiumPreview />
          </ProductPanel>
        </div>
      </section>

      {/* Payment flow */}
      <section className="border-t border-goaliq-border/50 bg-goaliq-card/15 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="mb-3 text-center text-2xl font-bold">How payments work</h2>
          <p className="mb-10 text-center text-sm text-goaliq-muted">
            Free to browse. Pay only when you want depth — on Injective testnet.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FlowStep step={1} icon={<MessageSquare className="h-5 w-5" />} title="Ask AI" desc="Request win chances or H2H analysis" />
            <FlowStep step={2} icon={<Sparkles className="h-5 w-5" />} title="Unlock insight" desc="GOALIQ detects a premium query" />
            <FlowStep step={3} icon={<Wallet className="h-5 w-5" />} title="Approve USDC" desc={`${PREMIUM_USDC} USDC in Keplr on Injective`} />
            <FlowStep step={4} icon={<BarChart3 className="h-5 w-5" />} title="Get report" desc="Structured stats delivered instantly" />
          </div>
        </div>
      </section>

      {/* Why GOALIQ */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-bold">Why GOALIQ?</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <WhyCard icon={<Radio className="h-5 w-5 text-goaliq-live" />} title="Real-time scores" desc="Live, today, upcoming, and full tournament results." />
          <WhyCard icon={<Bot className="h-5 w-5 text-goaliq-accent" />} title="AI copilot" desc="Ask football questions in plain English — ninja-friendly." />
          <WhyCard icon={<Zap className="h-5 w-5 text-goaliq-gold" />} title="Pay per insight" desc="No accounts or subscriptions. Unlock only what you need." />
          <WhyCard icon={<Shield className="h-5 w-5 text-goaliq-success" />} title="Powered by Injective" desc="Keplr wallet, testnet USDC, and x402 micropayments." />
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold">Simple pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <PricingCard
            title="Free"
            price="0 USDC"
            accent="border-goaliq-border"
            items={["Live scores & fixtures", "Results & knockout", "AI chat for schedules", "Wallet & funding guides"]}
          />
          <PricingCard
            title="Premium"
            price={`${PREMIUM_USDC} USDC / insight`}
            accent="border-goaliq-gold/30"
            highlight
            items={["Win probability & form", "Head-to-head analysis", "Match page unlock", "Keplr on-chain payment"]}
          />
        </div>
      </section>

      {/* Powered by */}
      <section className="border-t border-goaliq-border/50 py-12">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-goaliq-muted">
          Built for the Injective Global Cup · Powered by
        </p>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 px-4">
          {["Injective", "Keplr", "Groq AI", "football-data.org", "x402", "Next.js"].map((name) => (
            <span
              key={name}
              className="rounded-xl border border-goaliq-border bg-goaliq-card/50 px-5 py-2.5 text-sm font-medium text-slate-300"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to follow the World Cup with AI?</h2>
        <p className="mx-auto mt-4 max-w-lg text-goaliq-muted">
          Track every match. Ask anything. Unlock premium insights in one click.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-goaliq-accent px-10 py-4 text-lg font-semibold text-goaliq-bg shadow-glow transition-all hover:bg-sky-300 hover:scale-[1.02]"
        >
          Launch GOALIQ <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative rounded-2xl border border-goaliq-border bg-goaliq-card/60 p-4 shadow-card backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-goaliq-border/50 pb-3">
        <GoaliqWordmark size="sm" showTagline={false} />
        <span className="text-sm font-medium text-goaliq-muted">Dashboard</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-goaliq-live">
          <span className="h-1.5 w-1.5 rounded-full bg-goaliq-live animate-pulse" /> Live
        </span>
      </div>
      <div className="space-y-2">
        <MockMatch live home="Switzerland" away="Colombia" score="1–1" minute="FT (pens)" />
        <MockMatch home="France" away="Morocco" score="—" time="Upcoming · 20:00" />
      </div>
      <div className="mt-3 rounded-lg border border-goaliq-border/50 bg-black/20 p-3">
        <p className="text-[10px] uppercase tracking-wider text-goaliq-muted mb-1">Copilot</p>
        <p className="text-xs text-slate-400">"Win chances for Switzerland?" → Premium unlock</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-goaliq-accent/10 py-2">
          <p className="text-lg font-bold text-goaliq-accent">61%</p>
          <p className="text-[10px] text-goaliq-muted">Win chance</p>
        </div>
        <div className="rounded-lg bg-white/5 py-2">
          <p className="text-lg font-bold">WWDLW</p>
          <p className="text-[10px] text-goaliq-muted">Form</p>
        </div>
        <div className="rounded-lg bg-goaliq-gold/10 py-2">
          <p className="text-lg font-bold text-goaliq-gold">0.01</p>
          <p className="text-[10px] text-goaliq-muted">USDC</p>
        </div>
      </div>
    </div>
  );
}

function PremiumPreview() {
  return (
    <div className="rounded-lg border border-goaliq-gold/20 bg-black/25 p-3 text-xs">
      <p className="text-[10px] uppercase tracking-wider text-goaliq-gold mb-2">Example premium insight</p>
      <p className="font-semibold text-sm mb-3">Switzerland vs Colombia</p>
      <div className="space-y-2 text-goaliq-muted">
        <div className="flex justify-between">
          <span>Switzerland win</span>
          <span className="font-semibold text-white">48%</span>
        </div>
        <div className="h-1.5 rounded-full bg-goaliq-border overflow-hidden">
          <div className="h-full w-[48%] rounded-full bg-goaliq-accent" />
        </div>
        <div className="flex justify-between">
          <span>Draw</span>
          <span className="text-white">24%</span>
        </div>
        <div className="flex justify-between">
          <span>Colombia win</span>
          <span className="text-white">28%</span>
        </div>
        <p className="pt-2 border-t border-goaliq-border/50">
          <span className="text-goaliq-muted">Form · </span>
          <span className="text-white">SUI WWDLW · COL WLDWW</span>
        </p>
        <p>
          <span className="text-goaliq-muted">H2H · </span>
          <span className="text-white">Last 3 meetings: 1W–1D–1L</span>
        </p>
      </div>
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold tabular-nums sm:text-3xl ${accent ? "text-goaliq-live" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-xs text-goaliq-muted sm:text-sm">{label}</p>
    </div>
  );
}

function ProductPanel({
  icon,
  title,
  href,
  bullets,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  bullets: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-goaliq-border bg-goaliq-card/40 p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mb-4 flex-1 rounded-xl border border-goaliq-border/50 bg-goaliq-bg/50 p-3">{children}</div>
      <ul className="mb-4 space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-xs text-goaliq-muted">
            <Check className="h-3.5 w-3.5 shrink-0 text-goaliq-success" />
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
  icon,
  title,
  desc,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative rounded-xl border border-goaliq-border bg-goaliq-card/50 p-5 text-center">
      <span className="absolute -top-2.5 left-4 rounded-full bg-goaliq-accent px-2 py-0.5 text-[10px] font-bold text-goaliq-bg">
        {step}
      </span>
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-goaliq-accent">
        {icon}
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="mt-1 text-xs text-goaliq-muted">{desc}</p>
    </div>
  );
}

function WhyCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-goaliq-border bg-goaliq-card/30 p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-goaliq-muted leading-relaxed">{desc}</p>
    </div>
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
    <div className={`rounded-lg border px-3 py-2 text-xs ${live ? "border-goaliq-live/30 bg-goaliq-live/5" : "border-goaliq-border/50 bg-black/20"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-slate-300">
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
    <div className={`rounded-lg px-2.5 py-1.5 ${role === "user" ? "bg-goaliq-accent/15 text-goaliq-accent ml-4" : "bg-white/5 text-slate-300 mr-4"}`}>
      <p className={`text-xs leading-relaxed ${muted ? "text-goaliq-muted italic" : ""}`}>{text}</p>
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
  items: string[];
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
          <li key={item} className="flex items-start gap-2 text-sm text-goaliq-muted">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-goaliq-success" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
