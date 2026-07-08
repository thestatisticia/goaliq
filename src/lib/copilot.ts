import type { Match, CopilotContext } from "./types";
import { ninjaGreeting, formatGreetingReply } from "./copilot-personality";

const INTENT_PATTERNS: { pattern: RegExp; intent: string }[] = [
  { pattern: /score|winning|result/i, intent: "score" },
  { pattern: /standings|table|group/i, intent: "standings" },
  { pattern: /today|tonight|this evening/i, intent: "today" },
  { pattern: /fixture|schedule|upcoming|next match/i, intent: "fixtures" },
  { pattern: /h2h|head.to.head|history/i, intent: "h2h" },
  { pattern: /analysis|tactical|insight|premium/i, intent: "premium" },
  { pattern: /swap|trade|convert|exchange/i, intent: "swap" },
  { pattern: /bridge|fund|cctp|usdc|wallet/i, intent: "fund" },
  { pattern: /x402|pay|unlock/i, intent: "x402" },
  { pattern: /help|what can you/i, intent: "help" },
];

/** Questions like "What World Cup matches are today?" — answer from API only, not LLM. */
export function isTodayScheduleQuery(message: string): boolean {
  const hasToday = /\b(today|tonight|this evening|today'?s)\b/i.test(message);
  const hasMatch = /\b(match|matches|game|games|fixture|fixtures|schedule|kick.?off|playing)\b/i.test(message);
  const asksWorldCup = /world cup|wc\b|fifa/i.test(message);
  return hasToday && (hasMatch || asksWorldCup);
}

/** User wants preview / analysis, not just kickoff times. */
export function wantsMatchAnalysis(message: string): boolean {
  return /\b(analys[ei]s|analy[sz]e|preview|breakdown|insight|outlook|prediction|predict|win\s+chance|who\s+will\s+win|odds|forecast|tell\s+me\s+about)\b/i.test(
    message
  );
}

/** "Analysis for the next matches" — previews with form, not a bare fixture list. */
export function isUpcomingAnalysisQuery(message: string): boolean {
  if (!wantsMatchAnalysis(message)) return false;
  const asksUpcoming =
    /\b(next|upcoming|future|knockout|quarter|semi|final|round)\b/i.test(message) ||
    /\b(these|those)\s+match/i.test(message);
  const asksMatch = /\b(match|matches|game|games|fixture|fixtures)\b/i.test(message);
  return asksUpcoming && asksMatch;
}

/** Single-match deep analysis (premium) — not bulk "next matches" previews. */
export function isSingleMatchAnalysisQuery(message: string): boolean {
  return wantsMatchAnalysis(message) && !isUpcomingAnalysisQuery(message);
}

/** "When is the next match?" / upcoming schedule — API only, not LLM. */
export function isNextMatchesQuery(message: string): boolean {
  if (isTodayScheduleQuery(message)) return false;
  if (wantsMatchAnalysis(message)) return false;
  const asksWhen = /\b(next|upcoming|when|future|see)\b/i.test(message);
  const asksMatch = /\b(match|matches|game|games|fixture|fixtures|kick.?off|play|round)\b/i.test(message);
  return asksWhen && asksMatch;
}

/** Swap/trade requests — GOALIQ cannot execute these. */
export function isSwapOrTradeQuery(message: string): boolean {
  return /\b(swap|trade|convert|exchange)\b/i.test(message) && /\b(usdc|inj|injective|token)\b/i.test(message);
}

export { isGreetingMessage, formatGreetingReply, isTeamOutcomeQuery, ninjaGreeting } from "./copilot-personality";

export function formatTeamOutcomeReply(team: { id: number; name: string }, match: Match): string {
  const isHome = match.teams.home.id === team.id;
  const isAway = match.teams.away.id === team.id;
  if (!isHome && !isAway) {
    return `${ninjaGreeting()} I couldn't line up **${team.name}** with a recent result — check the dashboard **Results** tab, ninja.`;
  }

  const homeGoals = match.goals?.home ?? 0;
  const awayGoals = match.goals?.away ?? 0;
  const teamGoals = isHome ? homeGoals : awayGoals;
  const oppGoals = isHome ? awayGoals : homeGoals;
  const opponent = isHome ? match.teams.away.name : match.teams.home.name;
  const round = match.league.round ?? "the tournament";
  const resultScore = `**${oppGoals}–${teamGoals}**`;

  if (teamGoals > oppGoals) {
    return [
      `${ninjaGreeting()} Good news — **${team.name}** are still dancing!`,
      "",
      `They beat **${opponent}** **${teamGoals}–${oppGoals}** in the **${round}**.`,
      "",
      "Want win chances for their next match? Just ask, ninja.",
    ].join("\n");
  }

  if (teamGoals === oppGoals) {
    return [
      `${ninjaGreeting()} It ended level — **${teamGoals}–${oppGoals}** between **${team.name}** and **${opponent}** in the **${round}**.`,
      "",
      "Check the dashboard for how it was settled (penalties, etc.).",
    ].join("\n");
  }

  const empathy =
    team.name.toLowerCase().includes("egypt")
      ? "The Pharaohs gave it a real go."
      : `${team.name} put up a fight.`;

  return [
    `${ninjaGreeting()} Tough one.`,
    "",
    `**${team.name}** are out — **${opponent}** beat them ${resultScore} in the **${round}**.`,
    "",
    `${empathy} Want to see who's still in or what's on today?`,
  ].join("\n");
}

export function formatSwapNotSupportedReply(wallet?: {
  injBalance?: string | null;
  usdcBalance?: string | null;
}): string {
  const inj = wallet?.injBalance ?? "?";
  const usdc = wallet?.usdcBalance ?? "?";

  return [
    `${ninjaGreeting()} I wish I could swap for you — but **GOALIQ doesn't do token swaps**, ninja.`,
    "",
    "This app only uses your wallet for **0.01 USDC** premium insights (win chances, H2H). No DEX built in.",
    "",
    wallet ? `**Your balance:** ${inj} INJ · ${usdc} USDC — plenty for gas and premium queries!` : "",
    "",
    "**Need more INJ?** Free testnet faucet (not a swap): https://testnet.faucet.injective.network",
    "",
    "**Need USDC?** Circle faucet with your 0x address: https://faucet.circle.com",
    "",
    "Or hit **Fund Wallet** in the app for the full walkthrough.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatTodayScheduleReply(schedule: {
  date: string;
  live: Match[];
  finished: Match[];
  upcoming: Match[];
}): string {
  const dateLabel = new Date(`${schedule.date}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const sections: string[] = [
    `${ninjaGreeting()} Here's your World Cup lineup for **${dateLabel}**:`,
    "",
  ];

  if (schedule.live.length) {
    sections.push("**Live now**");
    for (const m of schedule.live) {
      sections.push(
        `• ${m.teams.home.name} **${m.goals?.home ?? "-"}–${m.goals?.away ?? "-"}** ${m.teams.away.name} — ${m.league.round ?? "Knockout"}`
      );
    }
    sections.push("");
  }

  if (schedule.finished.length) {
    sections.push("**Finished today**");
    for (const m of schedule.finished) {
      sections.push(
        `• ${m.teams.home.name} **${m.goals?.home ?? "-"}–${m.goals?.away ?? "-"}** ${m.teams.away.name} — ${m.league.round ?? "Knockout"}`
      );
    }
    sections.push("");
  }

  if (schedule.upcoming.length) {
    sections.push("**Still to play today**");
    for (const m of schedule.upcoming) {
      const time =
        new Date(m.fixture.date).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }) + " UTC";
      sections.push(`• ${m.teams.home.name} vs ${m.teams.away.name} — ${time} — ${m.league.round ?? "Knockout"}`);
    }
    sections.push("");
  }

  const total = schedule.live.length + schedule.finished.length + schedule.upcoming.length;
  if (total === 0) {
    return `${ninjaGreeting()} Quiet day on the pitch — no World Cup matches on **${dateLabel}**, ninja. Check the dashboard **Today** tab when the next match day rolls around.`;
  }

  sections.push(`_${total} match${total === 1 ? "" : "es"} today — data from football-data.org._`);

  return sections.join("\n");
}

export function formatUpcomingScheduleReply(matches: Match[]): string {
  if (!matches.length) {
    return `${ninjaGreeting()} No more World Cup fixtures are on the calendar right now, ninja — check the dashboard **Results** tab for what's already done.`;
  }

  const lines = matches.map((m) => {
    const dt = new Date(m.fixture.date);
    const dateStr = dt.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeStr =
      dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
    return `• **${dateStr}** ${timeStr} — ${m.teams.home.name} vs ${m.teams.away.name} (${m.league.round ?? "Knockout"})`;
  });

  return [
    `${ninjaGreeting()} Here are the **next World Cup matches** — not started yet, so no scores:`,
    "",
    ...lines,
    "",
    `_Times in UTC. Live scores appear on the dashboard **Live** tab once kickoff hits._`,
  ].join("\n");
}

export function detectIntent(message: string): string {
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(message)) return intent;
  }
  return "general";
}

export function buildCopilotResponse(
  intent: string,
  message: string,
  context: CopilotContext,
  data?: { matches?: Match[]; standings?: string; premiumUrl?: string }
): string {
  const ctx = context.matchId
    ? `You're viewing ${context.homeTeam} vs ${context.awayTeam} (${context.score ?? "—"}, ${context.status ?? "—"}).`
    : "";

  switch (intent) {
    case "score":
      if (context.matchId) {
        return `${ninjaGreeting()} You're on **${context.homeTeam} vs ${context.awayTeam}** — score **${context.score}**, status: ${context.status}. Pop open the dashboard for live events, ninja.`;
      }
      if (data?.matches?.length) {
        const lines = data.matches.map(
          (m) => `• ${m.teams.home.name} ${m.goals.home ?? "-"} – ${m.goals.away ?? "-"} ${m.teams.away.name}`
        );
        return `${ninjaGreeting()} Latest scores for you:\n\n${lines.join("\n")}`;
      }
      return `${ninjaGreeting()} Check the dashboard **Live** or **Results** tabs for scores, ninja.`;

    case "standings":
      return data?.standings
        ? `${ninjaGreeting()} Group standings:\n\n${data.standings}`
        : `${ninjaGreeting()} Head to the dashboard **Knockout** tab for tables, ninja.`;

    case "fixtures":
    case "today":
      if (data?.matches?.length) {
        const lines = data.matches.map(
          (m) => `• ${m.teams.home.name} vs ${m.teams.away.name} — ${new Date(m.fixture.date).toLocaleString()}`
        );
        return `Matches scheduled for today:\n\n${lines.join("\n")}`;
      }
      return "No World Cup matches scheduled for today. Check the dashboard **Today** tab.";

    case "h2h":
    case "premium":
      return `${ctx}\n\nPremium **Head-to-Head** and **Tactical Analysis** are gated via **x402** (0.01 testnet USDC per request).\n\n→ Click **Unlock Analysis** on the match page, or fetch:\n\`${data?.premiumUrl ?? "/api/premium/analysis"}\`\n\nUses Injective testnet USDC — no real money needed.`;

    case "fund":
      return `To fund your GOALIQ wallet with testnet USDC:\n\n1. Get testnet USDC from [Circle Faucet](https://faucet.circle.com) (select **Injective Testnet**)\n2. Or bridge via **CCTP** from Sepolia → Injective Testnet\n3. Visit the **Fund Wallet** page in the app\n\nDocs: https://docs.injective.network/developers-defi/usdc-cctp-tutorial`;

    case "swap":
      return formatSwapNotSupportedReply();

    case "x402":
      return `**x402** lets you pay per API call with testnet USDC — no API keys or subscriptions.\n\nGOALIQ premium endpoints:\n• \`GET /premium/h2h?team1=&team2=\` — 0.01 USDC\n• \`GET /premium/analysis?matchId=\` — 0.01 USDC\n\nServer runs on port 3001. Connect Keplr to Injective Testnet.`;

    case "help":
      return `${ninjaGreeting()} I'm **GOALIQ AI** — your World Cup intelligence copilot.\n\nTry asking me:\n• "What matches are today?"\n• "When is the next match?"\n• "So did Egypt lose?"\n• "Win chances for Switzerland"\n• "How do I fund my wallet?"\n\nI've got live data, friendly banter, and premium insights when you need the deep stuff.`;

    default:
      return `${ctx}\n\nI can help with live scores, standings, fixtures, premium x402 insights, and funding your wallet via CCTP.\n\nTry: "What's the score?" or "How do I bridge USDC?"`;
  }
}
