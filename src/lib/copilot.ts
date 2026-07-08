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

/**
 * "Did Norway proceed to the next round?" — progression questions.
 * Must be checked BEFORE isNextMatchesQuery, since it also contains "next round".
 */
export function isProgressionQuery(message: string): boolean {
  const asksProgress =
    /\b(proceed(?:ed)?|progress(?:ed)?|advanc(?:e|ed|ing)|qualif(?:y|ied|ies)|through|reach(?:ed|es)?|make\s+it|made\s+it|still\s+in|go(?:ing)?\s+through|survive[d]?|knocked\s+out|eliminated|crash(?:ed)?\s+out)\b/i.test(
      message
    );
  const roundHint =
    /\b(next\s+round|next\s+stage|knockout|quarter[\s-]?finals?|semi[\s-]?finals?|round\s+of\s+\d+|last\s+\d+)\b/i.test(
      message
    );
  const isQuestion = /\b(did|has|have|is|are|will|do|does)\b/i.test(message);
  return isQuestion && (asksProgress || roundHint);
}

export function formatProgressionReply(
  team: { id: number; name: string },
  nextMatch: Match | null,
  lastFinished: Match | null
): string {
  const roundOf = (m: Match) => m.league.round ?? "the knockouts";
  const oppName = (m: Match) => (m.teams.home.id === team.id ? m.teams.away.name : m.teams.home.name);

  const teamGoals = (m: Match) => (m.teams.home.id === team.id ? m.goals?.home ?? 0 : m.goals?.away ?? 0);
  const oppGoals = (m: Match) => (m.teams.home.id === team.id ? m.goals?.away ?? 0 : m.goals?.home ?? 0);

  if (nextMatch) {
    const opp = oppName(nextMatch);
    const dt = new Date(nextMatch.fixture.date);
    const when =
      dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
      " " +
      dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) +
      " UTC";

    const lines = [
      `${ninjaGreeting()} Yes — **${team.name}** are through!`,
      "",
      `They're in the **${roundOf(nextMatch)}**${opp && opp !== "TBD" ? ` against **${opp}**` : ""} — ${when}.`,
    ];

    if (lastFinished && teamGoals(lastFinished) >= oppGoals(lastFinished)) {
      lines.push(
        "",
        `They got here by seeing off **${oppName(lastFinished)}** **${teamGoals(lastFinished)}–${oppGoals(lastFinished)}** in the **${roundOf(lastFinished)}**.`
      );
    }

    lines.push("", "Want win chances for their next match? Just ask, ninja (premium, 0.01 USDC).");
    return lines.join("\n");
  }

  if (lastFinished) {
    const tg = teamGoals(lastFinished);
    const og = oppGoals(lastFinished);
    const opp = oppName(lastFinished);

    if (tg > og) {
      return [
        `${ninjaGreeting()} **${team.name}** won their last match **${tg}–${og}** vs **${opp}** in the **${roundOf(lastFinished)}** — so they're through, ninja.`,
        "",
        "Their next opponent isn't locked in yet (still TBD). Peek at the dashboard **Knockout** tab.",
      ].join("\n");
    }

    if (tg < og) {
      return [
        `${ninjaGreeting()} Tough one — **${team.name}** are **out**. **${opp}** beat them **${og}–${tg}** in the **${roundOf(lastFinished)}**.`,
        "",
        "Want to see who's still in the hunt? Just ask, ninja.",
      ].join("\n");
    }

    return [
      `${ninjaGreeting()} **${team.name}** drew their last match **${tg}–${og}** vs **${opp}** in the **${roundOf(lastFinished)}** — it may have gone to penalties.`,
      "",
      "Check the dashboard **Knockout** tab to see who advanced, ninja.",
    ].join("\n");
  }

  return `${ninjaGreeting()} I couldn't pin down a recent result for **${team.name}**, ninja — check the dashboard **Knockout** tab.`;
}

/** "Show group standings" / "who leads Group A?" / "how many points does Spain have?" */
export function isStandingsQuery(message: string): boolean {
  if (isKnockoutBracketQuery(message)) return false;
  return /\b(standings?|group\s+[a-l]\b|top\s+of\s+group|leads?\s+group|who\s+finished\s+first|second\s+place|how\s+many\s+points|points\s+does|qualified\s+for\s+(the\s+)?knockout|through\s+to\s+the\s+knockout)\b/i.test(
    message
  );
}

/** Knockout bracket / who's left / round of 16 */
export function isKnockoutBracketQuery(message: string): boolean {
  return /\b(knockout\s+bracket|round\s+of\s+(16|32)|semifinals?|semi[\s-]?finals?|who\s+(is\s+)?in\s+the\s+(final|semifinals?)|who\s+won\s+the\s+world\s+cup|teams?\s+(are\s+)?left|still\s+in\s+the\s+(tournament|hunt)|reached\s+the\s+final|who\s+plays\s+in\s+the)\b/i.test(
    message
  );
}

/** Live scores — who's winning, who scored, etc. */
export function isLiveScoreQuery(message: string): boolean {
  if (wantsMatchAnalysis(message)) return false;
  return /\b(live\s+now|who\s+is\s+winning|what'?s?\s+the\s+score|score\s+now|is\s+the\s+match\s+over|who\s+scored|sent\s+off|stoppage\s+time|player\s+of\s+the\s+match|matches?\s+are\s+live|live\s+scores?)\b/i.test(
    message
  );
}

/** "What time does Brazil play?" / "is Argentina playing today?" */
export function isTeamScheduleQuery(message: string): boolean {
  return (
    (/\b(what\s+time|when)\b/i.test(message) && /\b(play|playing|kick\s*off|match)\b/i.test(message)) ||
    /\b(is\s+.+\s+playing\s+(today|tonight))\b/i.test(message) ||
    /\b(playing\s+today|playing\s+tonight)\b/i.test(message)
  );
}

/** Tomorrow's matches */
export function isTomorrowScheduleQuery(message: string): boolean {
  return /\b(tomorrow)\b/i.test(message) && /\b(match|matches|game|fixture|playing|world cup|kick)\b/i.test(message);
}

/** Team form — last 5 matches, how has X performed */
export function isTeamFormQuery(message: string): boolean {
  if (wantsMatchAnalysis(message)) return false;
  return /\b(form|last\s+\d+\s+matches?|performed\s+recently|good\s+form|in\s+better\s+form|last\s+five)\b/i.test(
    message
  );
}

export function formatStandingsReply(standings: import("./types").StandingGroup[], groupFilter?: string): string {
  if (!standings.length) {
    return `${ninjaGreeting()} Group standings aren't available yet, ninja — check back once group-stage matches are in.`;
  }

  const filtered = groupFilter
    ? standings.filter((g) => g.group.toLowerCase().includes(groupFilter.toLowerCase()))
    : standings;

  const groups = filtered.length ? filtered : standings;

  const sections: string[] = [`${ninjaGreeting()} **World Cup group standings:**`, ""];

  for (const g of groups) {
    sections.push(`**${g.group}**`);
    for (const row of g.table.slice(0, 4)) {
      sections.push(
        `${row.rank}. **${row.team.name}** — ${row.points} pts (${row.all.played} played, GD ${row.goalsDiff > 0 ? "+" : ""}${row.goalsDiff})${row.form ? ` · form: ${row.form}` : ""}`
      );
    }
    sections.push("");
  }

  sections.push("_Data from football-data.org. Knockout ties on the dashboard **Knockout** tab._");
  return sections.join("\n");
}

export function formatKnockoutBracketReply(matches: Match[]): string {
  const knockout = matches.filter((m) => {
    const r = (m.league.round ?? "").toLowerCase();
    return r.includes("round of") || r.includes("last") || r.includes("quarter") || r.includes("semi") || r.includes("final") || r.includes("third");
  });

  if (!knockout.length) {
    return `${ninjaGreeting()} Knockout fixtures aren't loaded yet, ninja — check the dashboard **Knockout** tab.`;
  }

  const byRound = new Map<string, Match[]>();
  for (const m of knockout) {
    const round = m.league.round ?? "Knockout";
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push(m);
  }

  const stillIn = new Set<string>();
  const upcoming = knockout.filter((m) => !["FT", "AET", "PEN"].includes(m.fixture.status.short));
  for (const m of upcoming) {
    if (m.teams.home.name && m.teams.home.name !== "TBD") stillIn.add(m.teams.home.name);
    if (m.teams.away.name && m.teams.away.name !== "TBD") stillIn.add(m.teams.away.name);
  }

  const lines: string[] = [`${ninjaGreeting()} **Knockout bracket** (from live fixture data):`, ""];

  for (const [round, roundMatches] of Array.from(byRound.entries())) {
    lines.push(`**${round}**`);
    for (const m of roundMatches.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())) {
      const status = ["FT", "AET", "PEN"].includes(m.fixture.status.short)
        ? `**${m.goals.home}–${m.goals.away}**`
        : new Date(m.fixture.date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
      lines.push(`• ${m.teams.home.name} vs ${m.teams.away.name} — ${status}`);
    }
    lines.push("");
  }

  if (stillIn.size) {
    lines.push(`**Still in the hunt (${stillIn.size} teams):** ${Array.from(stillIn).sort().join(", ")}`);
  }

  return lines.join("\n");
}

export function formatLiveScoresReply(live: Match[]): string {
  if (!live.length) {
    return `${ninjaGreeting()} No live World Cup matches right now, ninja. Check **Today's matches** or ask for the next fixture.`;
  }

  const lines = live.map((m) => {
    const min = m.fixture.status.elapsed != null ? ` (${m.fixture.status.elapsed}')` : "";
    return `• **${m.teams.home.name} ${m.goals.home ?? 0}–${m.goals.away ?? 0} ${m.teams.away.name}**${min} — ${m.fixture.status.long} · ${m.league.round ?? ""}`;
  });

  return [
    `${ninjaGreeting()} **Live now:**`,
    "",
    ...lines,
    "",
    "_Open a match page for goals, cards, and stats._",
  ].join("\n");
}

export function formatTeamScheduleReply(
  team: { name: string },
  match: Match | null,
  playingToday: boolean
): string {
  if (!match) {
    return `${ninjaGreeting()} **${team.name}** don't have an upcoming World Cup fixture on the calendar right now, ninja — they may be out or between rounds.`;
  }

  const dt = new Date(match.fixture.date);
  const when =
    dt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) +
    " at " +
    dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) +
    " UTC";
  const opp = match.teams.home.name === team.name ? match.teams.away.name : match.teams.home.name;
  const venue = match.fixture.venue?.name ? ` at ${match.fixture.venue.name}` : "";

  if (playingToday) {
    return `${ninjaGreeting()} Yes — **${team.name}** play **${opp}** today (${when})${venue}. ${match.league.round ?? ""}`;
  }

  return `${ninjaGreeting()} **${team.name}** vs **${opp}** — ${when}${venue}. ${match.league.round ?? ""}`;
}

export function formatTeamFormReply(team: { id?: number; name: string }, results: Match[]): string {
  if (!results.length) {
    return `${ninjaGreeting()} No finished World Cup matches found for **${team.name}** yet, ninja.`;
  }

  const lines = results.map((m) => {
    const isHome =
      (team.id != null && m.teams.home.id === team.id) || m.teams.home.name === team.name;
    const gf = isHome ? m.goals.home! : m.goals.away!;
    const ga = isHome ? m.goals.away! : m.goals.home!;
    const wdl = gf > ga ? "W" : gf < ga ? "L" : "D";
    const opp = isHome ? m.teams.away.name : m.teams.home.name;
    return `• ${wdl} vs **${opp}** ${gf}–${ga} (${m.league.round ?? "WC"})`;
  });

  const wins = results.filter((m) => {
    const isHome = m.teams.home.name === team.name;
    const gf = isHome ? m.goals.home! : m.goals.away!;
    const ga = isHome ? m.goals.away! : m.goals.home!;
    return gf > ga;
  }).length;

  return [
    `${ninjaGreeting()} **${team.name}** — last ${results.length} World Cup matches:`,
    "",
    ...lines,
    "",
    `Record: **${wins}W** in last ${results.length}. Want win chances for their next match? Ask for premium analysis (0.01 USDC).`,
  ].join("\n");
}

export function formatStandingsForLLM(standings: import("./types").StandingGroup[]): string {
  return standings
    .map((g) => {
      const rows = g.table
        .map((r) => `${r.rank}. ${r.team.name} ${r.points}pts (${r.all.played}P ${r.all.win}W ${r.all.draw}D ${r.all.lose}L GD${r.goalsDiff})`)
        .join("\n");
      return `${g.group}:\n${rows}`;
    })
    .join("\n\n");
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
