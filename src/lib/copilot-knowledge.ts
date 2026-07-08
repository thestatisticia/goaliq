/** Static World Cup knowledge — safe to answer without live APIs. */

export const WC2026_FACTS = {
  teams: 48,
  totalMatches: 104,
  format:
    "48 teams in 12 groups of 4. Top two from each group plus the eight best third-placed teams advance (32 teams) to the Round of 32, then standard knockouts through the Final.",
  tiebreakers:
    "Group ties: points, then goal difference, goals scored, head-to-head points, head-to-head goal difference, head-to-head goals scored, fair play, then drawing of lots.",
  hosts: "USA, Canada, and Mexico (2026).",
  finalDate: "Check the dashboard **Knockout** tab for the exact Final kickoff — it updates from live fixture data.",
};

export const WC_HISTORY: Record<string, string> = {
  "last world cup winner": "Argentina won the 2022 FIFA World Cup in Qatar, beating France on penalties in the final.",
  "brazil world cups": "Brazil have won 5 World Cups (1958, 1962, 1970, 1994, 2002) — the most of any nation.",
  "most world cups": "Brazil (5) have won the most Men's World Cups, followed by Germany and Italy (4 each).",
  "fastest goal": "Hakan Şükür scored after 11 seconds for Turkey vs South Korea at the 2002 World Cup — the fastest goal in tournament history.",
  "most goals all time": "Miroslav Klose holds the record with 16 World Cup goals.",
};

export function isKnowledgeQuery(message: string): boolean {
  return (
    /\b(how many teams|how many matches|qualification system|knockout stage work|tie[\s-]?break|tiebreaker|finish level on points|when is the final|host cities?|how does the (group|knockout))\b/i.test(
      message
    ) ||
    /\b(who won the last world cup|last world cup|how many world cups|most world cups|biggest upset in history|fastest goal|most world cup goals|top scorer.{0,20}history)\b/i.test(
      message
    )
  );
}

export function answerKnowledgeQuery(message: string): string | null {
  const lower = message.toLowerCase();

  if (/\bhow many teams\b/i.test(message)) {
    return `**${WC2026_FACTS.teams} teams** compete at the 2026 World Cup — the first expanded 48-team edition.`;
  }
  if (/\bhow many matches\b/i.test(message)) {
    return `There are **${WC2026_FACTS.totalMatches} matches** in the full 2026 World Cup schedule.`;
  }
  if (/\b(knockout|round of 32|elimination)\b/i.test(message) && /\b(work|format|how)\b/i.test(message)) {
    return WC2026_FACTS.format;
  }
  if (/\b(tie[\s-]?break|tiebreaker|level on points)\b/i.test(message)) {
    return WC2026_FACTS.tiebreakers;
  }
  if (/\bwhen is the final\b/i.test(message)) {
    return WC2026_FACTS.finalDate;
  }
  if (/\b(host|hosts|hosting)\b/i.test(message)) {
    return `The 2026 World Cup is co-hosted by **${WC2026_FACTS.hosts}**`;
  }

  for (const [key, answer] of Object.entries(WC_HISTORY)) {
    if (lower.includes(key.split(" ")[0]) && key.split(" ").some((w) => lower.includes(w))) {
      if (key === "last world cup winner" && /\b(last|2022|previous)\b/i.test(message)) return answer;
      if (key === "brazil world cups" && /\bbrazil\b/i.test(message) && /\b(won|world cup|titles?)\b/i.test(message))
        return answer;
      if (key === "most world cups" && /\b(most|record)\b/i.test(message)) return answer;
      if (key === "fastest goal" && /\bfastest\b/i.test(message)) return answer;
      if (key === "most goals all time" && /\b(most goals|all[\s-]?time|record)\b/i.test(message)) return answer;
    }
  }

  if (/\bwho won the last world cup\b/i.test(message)) return WC_HISTORY["last world cup winner"];
  if (/\bhow many world cups has brazil\b/i.test(message)) return WC_HISTORY["brazil world cups"];
  if (/\bwhich country has won the most\b/i.test(message)) return WC_HISTORY["most world cups"];

  return null;
}

/** Topics we cannot answer reliably from current APIs. */
export const DATA_LIMITS = [
  "Live player stats (top scorer, assists, yellow cards, injuries) need API-Football player endpoints — not wired yet.",
  "Expected goals (xG) and detailed live stats are on individual match pages when API-Football data is available.",
  "Fun/subjective questions (best goal, loudest fans, MVP) — the LLM can discuss using match results in context only.",
];
