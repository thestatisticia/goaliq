import { NextResponse } from "next/server";
import {
  getLiveMatches,
  getFixtures,
  getRecentResults,
  getAllWorldCupMatches,
  getTodaysWorldCupSchedule,
  getUpcomingWorldCupMatches,
  getLatestFinishedMatchForTeam,
  formatMatchesForLLM,
} from "@/lib/football-api";
import { chatCompletion, COPILOT_SYSTEM_PROMPT, getAvailableModels, getDefaultModel } from "@/lib/llm";
import {
  detectIntent,
  buildCopilotResponse,
  isTodayScheduleQuery,
  isNextMatchesQuery,
  formatTodayScheduleReply,
  formatUpcomingScheduleReply,
  isSwapOrTradeQuery,
  formatSwapNotSupportedReply,
  isGreetingMessage,
  formatGreetingReply,
  isTeamOutcomeQuery,
  formatTeamOutcomeReply,
  ninjaGreeting,
} from "@/lib/copilot";
import { resolveHeadToHead, findTeamMentionedInMessage } from "@/lib/team-resolver";
import { buildPremiumMatchReport } from "@/lib/match-analysis";
import { isPremiumQuery } from "@/lib/payments";
import type { CopilotContext } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    models: getAvailableModels(),
    default: getDefaultModel(),
    llmConfigured: getAvailableModels().length > 0,
    freeProviders: [
      { name: "Groq", url: "https://console.groq.com/keys", env: "GROQ_API_KEY", models: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"] },
      { name: "Google Gemini", url: "https://aistudio.google.com/apikey", env: "GEMINI_API_KEY", models: ["gemini-2.0-flash"] },
    ],
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const message: string = body.message ?? "";
  const context: CopilotContext = body.context ?? {};
  const modelId: string | undefined = body.modelId;
  const provider = body.provider;
  const txHash: string | undefined = body.txHash;

  const isPremium = isPremiumQuery(message);

  if (isPremium && !txHash) {
    return NextResponse.json({
      reply: "This is a premium query. It costs 0.01 USDC — confirm the payment in Keplr when prompted.",
      model: "payment-required",
      provider: "payment",
      intent: "payment",
    });
  }

  let liveData = "";
  let upcomingData = "";
  let recentData = "";
  let h2hData = "";

  const intent = detectIntent(message);

  if (isGreetingMessage(message)) {
    return NextResponse.json({
      reply: formatGreetingReply(),
      model: "goaliq",
      provider: "goaliq",
      intent: "greeting",
    });
  }

  // Casual team outcome ("so egypt lost", "did argentina win")
  if (isTeamOutcomeQuery(message)) {
    try {
      const team = await findTeamMentionedInMessage(message);
      if (team) {
        const match = await getLatestFinishedMatchForTeam(team.id);
        if (match) {
          return NextResponse.json({
            reply: formatTeamOutcomeReply(team, match),
            model: "football-data",
            provider: "football-data.org",
            intent: "team-outcome",
          });
        }
      }
      return NextResponse.json({
        reply: `${ninjaGreeting()} I couldn't find a recent result for that team, ninja — try the dashboard **Results** tab or ask about a specific matchup like "Argentina vs Egypt".`,
        model: "football-data",
        provider: "football-data.org",
        intent: "team-outcome",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `${ninjaGreeting()} Hit a snag loading results: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "team-outcome",
      });
    }
  }

  // Token swaps — not supported; block LLM from inventing faucet swaps
  if (isSwapOrTradeQuery(message)) {
    return NextResponse.json({
      reply: formatSwapNotSupportedReply(body.wallet ?? undefined),
      model: "wallet-info",
      provider: "goaliq",
      intent: "swap",
    });
  }

  // Today's schedule — structured API answer only (LLM was inventing future knockout games)
  if (isTodayScheduleQuery(message)) {
    try {
      const schedule = await getTodaysWorldCupSchedule();
      return NextResponse.json({
        reply: formatTodayScheduleReply(schedule),
        model: "football-data",
        provider: "football-data.org",
        intent: "today",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `Could not load today's schedule: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "today",
      });
    }
  }

  // Next / upcoming matches — structured API only (no invented scores)
  if (isNextMatchesQuery(message)) {
    try {
      const upcoming = await getUpcomingWorldCupMatches(12);
      return NextResponse.json({
        reply: formatUpcomingScheduleReply(upcoming),
        model: "football-data",
        provider: "football-data.org",
        intent: "upcoming",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `Could not load upcoming fixtures: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "upcoming",
      });
    }
  }

  // Premium — always return structured API report, never LLM apologies
  if (isPremium && txHash) {
    try {
      const premium = await buildPremiumMatchReport(message, {
        homeTeam: context.homeTeam,
        awayTeam: context.awayTeam,
      });
      if (premium) {
        return NextResponse.json({
          reply: premium.report,
          model: "premium-analysis",
          provider: "api-football",
          intent: "h2h",
          fixtureId: premium.fixtureId,
        });
      }
    } catch (e) {
      console.error("Premium analysis error:", e);
    }

    return NextResponse.json({
      reply: `${ninjaGreeting()} I couldn't find that matchup, ninja. Try **"win chances for Switzerland"** or **"Switzerland vs Colombia"**.`,
      model: "premium-error",
      provider: "api-football",
      intent: "h2h",
    });
  }

  if (intent === "h2h" || /head[\s-]?to[\s-]?head|h2h/i.test(message)) {
    try {
      const h2h = await resolveHeadToHead(message);
      if (h2h) h2hData = h2h.summary;
    } catch (e) {
      h2hData = `H2H fetch error: ${(e as Error).message}`;
    }
  }

  try {
    const [live, upcoming, recent] = await Promise.all([
      getLiveMatches(),
      getUpcomingWorldCupMatches(12),
      getRecentResults(8),
    ]);
    if (live.length) liveData = `LIVE NOW:\n${formatMatchesForLLM(live)}`;
    if (upcoming.length) upcomingData = `UPCOMING (not started — no scores):\n${formatMatchesForLLM(upcoming)}`;
    if (recent.length) recentData = `RECENT FINISHED:\n${formatMatchesForLLM(recent)}`;
  } catch (e) {
    liveData = `Data fetch error: ${(e as Error).message}`;
  }

  const matchContext = context.matchId
    ? `User is viewing: ${context.homeTeam} vs ${context.awayTeam}, score ${context.score}, status ${context.status}`
    : "";

  const walletContext = body.wallet
    ? `Wallet connected: ${body.wallet.evmAddress}, INJ: ${body.wallet.injBalance ?? "?"}, USDC: ${body.wallet.usdcBalance ?? "?"}`
    : "Wallet not connected.";

  const systemContext = [liveData, upcomingData, recentData, h2hData, matchContext, walletContext]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { reply, model, provider: usedProvider } = await chatCompletion(
      [
        { role: "system", content: `${COPILOT_SYSTEM_PROMPT}\n\n--- LIVE DATA ---\n${systemContext}` },
        { role: "user", content: message },
      ],
      modelId,
      provider
    );

    return NextResponse.json({ reply, model, provider: usedProvider, intent: "llm" });
  } catch (err) {
    if ((err as Error).message !== "NO_LLM_KEY") {
      console.error("LLM error:", err);
    }

    // Fallback to intent-based responses
    let matches;
    try {
      const all = await getAllWorldCupMatches();
      matches = all.slice(0, 8);
    } catch { /* empty */ }

    const x402Base = process.env.NEXT_PUBLIC_X402_API_URL ?? "http://localhost:3001";
    const premiumUrl = context.matchId
      ? `${x402Base}/premium/analysis?matchId=${context.matchId}`
      : `${x402Base}/premium/h2h`;

    const reply = h2hData
      ? `${h2hData}\n\n_Premium deep analysis available via x402 (0.01 USDC) on match pages._`
      : buildCopilotResponse(intent, message, context, {
          matches,
          standings: recentData || liveData,
          premiumUrl,
        });

    return NextResponse.json({
      reply: `${reply}\n\n---\n_Tip: Add a free GROQ_API_KEY or GEMINI_API_KEY to .env.local for smarter AI chat._`,
      model: "intent-fallback",
      provider: "fallback",
      intent,
    });
  }
}
