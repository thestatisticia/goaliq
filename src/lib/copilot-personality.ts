/** Friendly GOALIQ AI voice — always address the user as "ninja". */

import { MIN_PREMIUM_USDC } from "./payments";

export function ninjaGreeting(): string {
  const options = ["Hey ninja!", "Hello ninja!", "Yo ninja!", "What's up ninja!"];
  return options[Math.floor(Math.random() * options.length)];
}

export function isGreetingMessage(message: string): boolean {
  const t = message.trim();
  return /^(hi|hello|hey|yo|sup|hiya|good\s+(morning|afternoon|evening)|what'?s\s+up|howdy)\b/i.test(t);
}

export function formatGreetingReply(): string {
  return [
    `${ninjaGreeting()} Great to see you here.`,
    "",
    "I'm **GOALIQ AI** — your World Cup intelligence copilot. Ask me about **today's matches**, **live coverage**, who's **in or out**, or unlock **match intelligence** (from " +
    MIN_PREMIUM_USDC +
    " USDC).",
    "",
    "Try: *\"What World Cup matches are today?\"* or *\"So did Egypt lose?\"*",
  ].join("\n");
}

export function isTeamOutcomeQuery(message: string): boolean {
  const hasOutcome = /\b(lost|lose|out|eliminated|beaten|defeated|won|win|winning|through|advanced|knocked\s+out|going\s+home|qualified|still\s+in)\b/i.test(
    message
  );
  const hasTeamHint =
    /\b(so|did|has|have|is|are|was|were)\b/i.test(message) || message.trim().split(/\s+/).length <= 8;
  // Don't steal progression queries ("proceed to next round")
  if (/\b(proceed|next\s+round|next\s+stage)\b/i.test(message)) return false;
  // Don't steal tournament-winner forecasts ("who will win the world cup")
  if (/\b(world\s+cup|tournament|title|trophy|it\s+all)\b/i.test(message) && /\b(win|winning|wins|favou?rite|likely|lift)\b/i.test(message)) {
    return false;
  }
  return hasOutcome && hasTeamHint;
}
