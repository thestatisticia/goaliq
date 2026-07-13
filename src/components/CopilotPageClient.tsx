"use client";

import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { CopilotPanel } from "@/components/CopilotPanel";
import type { CopilotContext } from "@/lib/types";

import { MIN_PREMIUM_USDC } from "@/lib/payments";

export function CopilotPageClient({ context }: { context?: CopilotContext }) {
  const matchLabel =
    context?.homeTeam && context?.awayTeam
      ? `${context.homeTeam} vs ${context.awayTeam}`
      : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-goaliq-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-goaliq-accent/20 to-goaliq-accentDim/10 ring-1 ring-goaliq-accent/20">
            <Bot className="h-6 w-6 text-goaliq-accent" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-goaliq-accent">AI Copilot</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">GOALIQ AI</h1>
            <p className="mt-1 text-sm text-goaliq-muted">
              Free tournament chat and live coverage. Unlock premium football intelligence from{" "}
              {MIN_PREMIUM_USDC} USDC per insight.
            </p>
            {matchLabel && (
              <p className="mt-2 text-xs text-goaliq-gold">
                Match context: <span className="font-medium">{matchLabel}</span>
                {context?.score ? ` · ${context.score}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      <CopilotPanel context={context} />
    </div>
  );
}
