import { NextResponse } from "next/server";
import {
  getLiveMatches,
  getFixtures,
  getRecentResults,
  getAllWorldCupMatches,
  getTodaysWorldCupSchedule,
  getUpcomingWorldCupMatches,
  getLatestFinishedMatchForTeam,
  getStandings,
  getTeamWorldCupResults,
  formatMatchesForLLM,
} from "@/lib/football-api";
import { chatCompletion, COPILOT_SYSTEM_PROMPT, getAvailableModels, getDefaultModel } from "@/lib/llm";
import {
  detectIntent,
  buildCopilotResponse,
  isTodayScheduleQuery,
  isNextMatchesQuery,
  isUpcomingAnalysisQuery,
  isSingleMatchAnalysisQuery,
  isTournamentForecastQuery,
  formatTodayScheduleReply,
  formatUpcomingScheduleReply,
  isSwapOrTradeQuery,
  formatSwapNotSupportedReply,
  isGreetingMessage,
  formatGreetingReply,
  isTeamOutcomeQuery,
  formatTeamOutcomeReply,
  isProgressionQuery,
  formatProgressionReply,
  isStandingsQuery,
  isKnockoutBracketQuery,
  isLiveScoreQuery,
  isTeamScheduleQuery,
  isTomorrowScheduleQuery,
  isTeamFormQuery,
  formatStandingsReply,
  formatKnockoutBracketReply,
  formatLiveScoresReply,
  formatTeamScheduleReply,
  formatTeamFormReply,
  formatStandingsForLLM,
  ninjaGreeting,
  isHeadToHeadQuery,
} from "@/lib/copilot";
import { answerKnowledgeQuery, isKnowledgeQuery } from "@/lib/copilot-knowledge";
import { resolveHeadToHead, findTeamMentionedInMessage, resolveTeamsFromMessage } from "@/lib/team-resolver";
import { buildPremiumMatchReport, buildPremiumReportForTeams, buildFreeUpcomingAnalysis, buildTournamentForecast } from "@/lib/match-analysis";
import { isPremiumQuery, getTierForQuery, PRICING } from "@/lib/payments";
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

  // Tournament-winner forecast ("who will win the world cup?") — premium Forecast tier
  if (isTournamentForecastQuery(message)) {
    const tier = getTierForQuery(message);
    if (!txHash) {
      return NextResponse.json({
        reply: [
          `${ninjaGreeting()} Calling the champion is a **${tier.label}** — **${tier.usdc} USDC** on Injective testnet.`,
          `_${tier.blurb}._`,
          "",
          "Connect Keplr and ask again — I'll run the win-it-all model across every team still standing.",
        ].join("\n"),
        model: "payment-required",
        provider: "payment",
        intent: "payment",
      });
    }
    try {
      const forecast = await buildTournamentForecast();
      return NextResponse.json({
        reply: forecast,
        model: "premium-forecast",
        provider: "goaliq",
        intent: "forecast",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `Could not build the tournament forecast: ${(e as Error).message}`,
        model: "error",
        provider: "goaliq",
        intent: "forecast",
      });
    }
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

  // Progression ("did Norway proceed to the next round?") — must run before
  // isNextMatchesQuery, which greedily matches "next" + "round".
  if (isProgressionQuery(message)) {
    try {
      const team = await findTeamMentionedInMessage(message);
      if (team) {
        const [upcoming, lastFinished] = await Promise.all([
          getUpcomingWorldCupMatches(30),
          getLatestFinishedMatchForTeam(team.id),
        ]);
        const nextMatch =
          upcoming
            .filter((m) => m.teams.home.id === team.id || m.teams.away.id === team.id)
            .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ??
          null;
        return NextResponse.json({
          reply: formatProgressionReply(team, nextMatch, lastFinished),
          model: "football-data",
          provider: "football-data.org",
          intent: "progression",
        });
      }
      return NextResponse.json({
        reply: `${ninjaGreeting()} Which team, ninja? Ask like "did Norway proceed to the next round?" and I'll check the bracket.`,
        model: "football-data",
        provider: "football-data.org",
        intent: "progression",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `${ninjaGreeting()} Hit a snag checking the bracket: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "progression",
      });
    }
  }

  // Static tournament / historical facts (no hallucination)
  if (isKnowledgeQuery(message)) {
    const answer = answerKnowledgeQuery(message);
    if (answer) {
      return NextResponse.json({
        reply: `${ninjaGreeting()} ${answer}`,
        model: "goaliq-knowledge",
        provider: "goaliq",
        intent: "knowledge",
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

  // Tomorrow's schedule
  if (isTomorrowScheduleQuery(message)) {
    try {
      const all = await getAllWorldCupMatches();
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      const matches = all.filter((m) => m.fixture.date.startsWith(tomorrowStr) && m.fixture.status.short === "NS");
      if (!matches.length) {
        return NextResponse.json({
          reply: `${ninjaGreeting()} No World Cup matches scheduled for tomorrow (${tomorrowStr}), ninja.`,
          model: "football-data",
          provider: "football-data.org",
          intent: "tomorrow",
        });
      }
      return NextResponse.json({
        reply: formatUpcomingScheduleReply(matches).replace("next World Cup matches", "matches **tomorrow**"),
        model: "football-data",
        provider: "football-data.org",
        intent: "tomorrow",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `Could not load tomorrow's schedule: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "tomorrow",
      });
    }
  }

  // Team-specific kickoff ("what time does Brazil play?")
  if (isTeamScheduleQuery(message)) {
    try {
      const team = await findTeamMentionedInMessage(message);
      if (team) {
        const [schedule, upcoming] = await Promise.all([
          getTodaysWorldCupSchedule(),
          getUpcomingWorldCupMatches(30),
        ]);
        const todayMatches = [...schedule.live, ...schedule.upcoming, ...schedule.finished].filter(
          (m) => m.teams.home.id === team.id || m.teams.away.id === team.id
        );
        const nextUp =
          todayMatches[0] ??
          upcoming.find((m) => m.teams.home.id === team.id || m.teams.away.id === team.id) ??
          null;
        return NextResponse.json({
          reply: formatTeamScheduleReply(team, nextUp, todayMatches.length > 0),
          model: "football-data",
          provider: "football-data.org",
          intent: "team-schedule",
        });
      }
    } catch (e) {
      return NextResponse.json({
        reply: `Could not load team schedule: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "team-schedule",
      });
    }
  }

  // Live scores
  if (isLiveScoreQuery(message)) {
    try {
      const live = await getLiveMatches();
      return NextResponse.json({
        reply: formatLiveScoresReply(live),
        model: "football-data",
        provider: "football-data.org",
        intent: "live",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `Could not load live scores: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "live",
      });
    }
  }

  // Group standings
  if (isStandingsQuery(message)) {
    try {
      const standings = await getStandings();
      const groupMatch = message.match(/\bgroup\s+([a-l])\b/i);
      const groupFilter = groupMatch ? `Group ${groupMatch[1].toUpperCase()}` : undefined;
      return NextResponse.json({
        reply: formatStandingsReply(standings, groupFilter),
        model: "football-data",
        provider: "football-data.org",
        intent: "standings",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `Could not load standings: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "standings",
      });
    }
  }

  // Knockout bracket / who's left
  if (isKnockoutBracketQuery(message)) {
    try {
      const all = await getAllWorldCupMatches();
      return NextResponse.json({
        reply: formatKnockoutBracketReply(all),
        model: "football-data",
        provider: "football-data.org",
        intent: "knockout",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `Could not load knockout bracket: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "knockout",
      });
    }
  }

  // Team form (last N matches) — premium Match Snapshot
  if (isTeamFormQuery(message)) {
    const tier = getTierForQuery(message);
    if (!txHash) {
      return NextResponse.json({
        reply: [
          `${ninjaGreeting()} Team form is a **${tier.label}** — **${tier.usdc} USDC** on Injective testnet.`,
          `_${tier.blurb}._`,
          "",
          "Connect Keplr and ask again — I'll unlock recent World Cup results and form.",
        ].join("\n"),
        model: "payment-required",
        provider: "payment",
        intent: "payment",
      });
    }
    try {
      const team = await findTeamMentionedInMessage(message);
      if (team) {
        const results = await getTeamWorldCupResults(team.id, 5);
        return NextResponse.json({
          reply: formatTeamFormReply(team, results),
          model: "football-data",
          provider: "football-data.org",
          intent: "form",
        });
      }
      return NextResponse.json({
        reply: `${ninjaGreeting()} Which team, ninja? Try "How has France performed recently?"`,
        model: "football-data",
        provider: "football-data.org",
        intent: "form",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `Could not load team form: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "form",
      });
    }
  }

  // Player-level stats not yet in API layer
  if (/\b(top scorer|most assists|clean sheets?|injured|yellow cards?|goalkeeper|most saves|mbapp[eé]|messi|player of the match)\b/i.test(message)) {
    return NextResponse.json({
      reply: `${ninjaGreeting()} Player stats (top scorer, cards, injuries, lineups) aren't in GOALIQ's data layer yet, ninja — open a **match page** for events when live, or ask about **standings**, or unlock **team form** / **win chances** (premium).`,
      model: "goaliq",
      provider: "goaliq",
      intent: "player-stats",
    });
  }

  // Compare teams — deep link to /compare page
  if (/\bcompare\b/i.test(message)) {
    const teams = await resolveTeamsFromMessage(message);
    if (teams) {
      const [t1, t2] = teams;
      return NextResponse.json({
        reply: `${ninjaGreeting()} Head to **Compare** for **${t1.name} vs ${t2.name}** — form, fixtures, and a shareable prediction card.\n\n→ [/compare?team1=${encodeURIComponent(t1.name)}&team2=${encodeURIComponent(t2.name)}](/compare)`,
        model: "goaliq",
        provider: "goaliq",
        intent: "compare",
      });
    }
  }

  // Head-to-head — free, structured API data (never LLM guesswork)
  if (isHeadToHeadQuery(message)) {
    try {
      const h2h = await resolveHeadToHead(message);
      if (h2h) {
        return NextResponse.json({
          reply: [
            `${ninjaGreeting()} Here's **${h2h.team1.name} vs ${h2h.team2.name}** from live World Cup data:`,
            "",
            h2h.summary,
            "",
            `_Want form + win chances? Ask **"win chances for ${h2h.team1.name} vs ${h2h.team2.name}"** (${PRICING.insight.usdc} USDC)._`,
          ].join("\n"),
          model: "football-data",
          provider: "football-data.org",
          intent: "h2h",
        });
      }
      return NextResponse.json({
        reply: `${ninjaGreeting()} Name both teams clearly, ninja — e.g. **"head to head Spain vs Belgium"**.`,
        model: "football-data",
        provider: "football-data.org",
        intent: "h2h",
      });
    } catch (e) {
      return NextResponse.json({
        reply: `${ninjaGreeting()} Couldn't load head-to-head data: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "h2h",
      });
    }
  }

  // Analysis for upcoming matches — previews with form (not a bare schedule list)
  if (isUpcomingAnalysisQuery(message)) {
    try {
      if (isPremium && txHash) {
        const upcoming = await getUpcomingWorldCupMatches(8);
        const withTeams = upcoming.filter(
          (m) => m.teams.home.name !== "TBD" && m.teams.away.name !== "TBD"
        );
        const reports: string[] = [];
        for (const m of withTeams.slice(0, 3)) {
          const premium = await buildPremiumReportForTeams(m.teams.home, m.teams.away);
          reports.push(premium.report);
        }
        if (reports.length) {
          return NextResponse.json({
            reply: reports.join("\n\n---\n\n"),
            model: "premium-analysis",
            provider: "api-football",
            intent: "upcoming-analysis",
          });
        }
      }

      const preview = await buildFreeUpcomingAnalysis(4);

      try {
        const { reply, model, provider: usedProvider } = await chatCompletion(
          [
            {
              role: "system",
              content: `${COPILOT_SYSTEM_PROMPT}\n\n--- UPCOMING MATCH DATA (use only this) ---\n${preview}`,
            },
            {
              role: "user",
              content: `${message}\n\nGive a friendly 2–3 sentence preview per match. Do not invent scores or results.`,
            },
          ],
          modelId,
          provider
        );
        return NextResponse.json({
          reply,
          model,
          provider: usedProvider,
          intent: "upcoming-analysis",
        });
      } catch {
        return NextResponse.json({
          reply: preview,
          model: "football-data",
          provider: "football-data.org",
          intent: "upcoming-analysis",
        });
      }
    } catch (e) {
      return NextResponse.json({
        reply: `Could not build match previews: ${(e as Error).message}`,
        model: "error",
        provider: "football-data.org",
        intent: "upcoming-analysis",
      });
    }
  }

  // Single-match analysis — premium (win %, form, H2H from API — never generic LLM)
  if (isSingleMatchAnalysisQuery(message)) {
    try {
      const teams = await resolveTeamsFromMessage(message);
      if (teams) {
        const [team1, team2] = teams;
        if (!txHash) {
          const tier = getTierForQuery(message);
          return NextResponse.json({
            reply: [
              `${ninjaGreeting()} **${team1.name} vs ${team2.name}** is a **${tier.label}** — **${tier.usdc} USDC** on Injective testnet.`,
              `_${tier.blurb}._`,
              "",
              "Connect Keplr and ask again — I'll prompt you to pay and unlock win chances, tournament form, and head-to-head.",
            ].join("\n"),
            model: "payment-required",
            provider: "payment",
            intent: "payment",
          });
        }
        const premium = await buildPremiumReportForTeams(team1, team2);
        return NextResponse.json({
          reply: premium.report,
          model: "premium-analysis",
          provider: "api-football",
          intent: "match-analysis",
          fixtureId: premium.fixtureId,
        });
      }

      if (!txHash) {
        const tier = getTierForQuery(message);
        return NextResponse.json({
          reply: `${ninjaGreeting()} Match analysis is a **${tier.label}** (**${tier.usdc} USDC**). Name both teams clearly, e.g. **"analyze France vs Morocco"**, then confirm payment in Keplr.`,
          model: "payment-required",
          provider: "payment",
          intent: "payment",
        });
      }
    } catch (e) {
      return NextResponse.json({
        reply: `Could not build match analysis: ${(e as Error).message}`,
        model: "error",
        provider: "api-football",
        intent: "match-analysis",
      });
    }
  }

  if (isPremium && !txHash) {
    const tier = getTierForQuery(message);
    return NextResponse.json({
      reply: `${ninjaGreeting()} That's a **${tier.label}** — **${tier.usdc} USDC** on Injective testnet.\n_${tier.blurb}._\n\nConnect Keplr and try again to pay & unlock.`,
      model: "payment-required",
      provider: "payment",
      intent: "payment",
    });
  }

  // Next / upcoming matches — schedule only (no invented scores)
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

  let standingsData = "";

  try {
    const [live, upcoming, recent, standings] = await Promise.all([
      getLiveMatches(),
      getUpcomingWorldCupMatches(12),
      getRecentResults(8),
      getStandings(),
    ]);
    if (live.length) liveData = `LIVE NOW:\n${formatMatchesForLLM(live)}`;
    if (upcoming.length) upcomingData = `UPCOMING (not started — no scores):\n${formatMatchesForLLM(upcoming)}`;
    if (recent.length) recentData = `RECENT FINISHED:\n${formatMatchesForLLM(recent)}`;
    if (standings.length) standingsData = `GROUP STANDINGS:\n${formatStandingsForLLM(standings)}`;
  } catch (e) {
    liveData = `Data fetch error: ${(e as Error).message}`;
  }

  const matchContext = context.matchId
    ? `User is viewing: ${context.homeTeam} vs ${context.awayTeam}, score ${context.score}, status ${context.status}`
    : "";

  const walletContext = body.wallet
    ? `Wallet connected: ${body.wallet.evmAddress}, INJ: ${body.wallet.injBalance ?? "?"}, USDC: ${body.wallet.usdcBalance ?? "?"}`
    : "Wallet not connected.";

  const systemContext = [liveData, upcomingData, recentData, standingsData, h2hData, matchContext, walletContext]
    .filter(Boolean)
    .join("\n\n");

  // Never let the LLM improvise single-match analysis — that's premium API data
  if (isSingleMatchAnalysisQuery(message)) {
    return NextResponse.json({
      reply: `${ninjaGreeting()} I couldn't resolve both teams in that message, ninja. Try **"analyze France vs Morocco"** — premium analysis starts at **${getTierForQuery(message).usdc} USDC**.`,
      model: "payment-required",
      provider: "payment",
      intent: "payment",
    });
  }

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
      ? `${h2hData}\n\n_Tactical Intelligence available on match pages from ${PRICING.report.usdc} USDC via Injective x402._`
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
