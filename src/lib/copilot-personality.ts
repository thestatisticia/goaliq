/** Friendly GOALIQ AI voice — always address the user as "ninja". */

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
    "I'm **GOALIQ AI** — your World Cup intelligence copilot. Ask me about **today's matches**, **live scores**, who's **in or out**, or **win chances** (premium, 0.01 USDC).",
    "",
    "Try: *\"What World Cup matches are today?\"* or *\"So did Egypt lose?\"*",
  ].join("\n");
}

export function isTeamOutcomeQuery(message: string): boolean {
  const hasOutcome = /\b(lost|lose|out|eliminated|beaten|defeated|won|win|winning|through|advanced|knocked\s+out|going\s+home)\b/i.test(
    message
  );
  const hasTeamHint =
    /\b(so|did|has|have|is|are|was|were)\b/i.test(message) || message.trim().split(/\s+/).length <= 6;
  return hasOutcome && hasTeamHint;
}
