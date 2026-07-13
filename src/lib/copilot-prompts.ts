/** One-click suggested prompts for the copilot UI. */

export type CopilotCategory = "live" | "tournament" | "premium" | "general";

export interface CopilotPromptChip {
  label: string;
  query: string;
  premium?: boolean;
  category?: CopilotCategory;
}

export const COPILOT_CATEGORY_META: Record<
  CopilotCategory,
  { label: string; pill: string }
> = {
  live: {
    label: "Live coverage",
    pill: "border-goaliq-accent/25 bg-goaliq-accent/10 text-goaliq-accent",
  },
  tournament: {
    label: "Tournament",
    pill: "border-goaliq-gold/25 bg-goaliq-gold/10 text-goaliq-gold",
  },
  premium: {
    label: "Premium insight",
    pill: "border-goaliq-success/25 bg-goaliq-success/10 text-goaliq-success",
  },
  general: {
    label: "Ask anything",
    pill: "border-goaliq-border bg-goaliq-surface/80 text-goaliq-muted",
  },
};

/** Hero row — three featured starters on the empty copilot screen. */
export const COPILOT_FEATURED_CHIPS: CopilotPromptChip[] = [
  {
    label: "See today's World Cup fixtures and kickoff times",
    query: "What World Cup matches are today?",
    category: "live",
  },
  {
    label: "Check who's still in and how the bracket looks",
    query: "Which teams are left in the tournament?",
    category: "tournament",
  },
  {
    label: "Unlock win chances and tactical breakdowns",
    query: "Analyze France vs Morocco",
    category: "premium",
    premium: true,
  },
];

export const COPILOT_PROMPT_CHIPS: CopilotPromptChip[] = [
  { label: "🏆 Today's matches", query: "What World Cup matches are today?", category: "live" },
  { label: "⚽ Who's winning?", query: "Who is winning right now?", category: "live" },
  { label: "📊 Live scores", query: "Which matches are live now?", category: "live" },
  { label: "📅 Next match", query: "What's the next World Cup match?", category: "live" },
  { label: "📋 Knockout bracket", query: "Show the knockout bracket", category: "tournament" },
  { label: "🏅 Who qualified?", query: "Which teams have qualified for the knockout stage?", category: "tournament" },
  { label: "🌍 Who's still in?", query: "Which teams are left in the tournament?", category: "tournament" },
  { label: "🇳🇴 Did Norway advance?", query: "Did Norway proceed to the next round?", category: "tournament" },
  { label: "📈 Group standings", query: "Show the group standings", category: "tournament" },
  { label: "🔥 Team form", query: "How has France performed recently?", category: "premium", premium: true },
  { label: "🤖 Match intelligence", query: "Analyze France vs Morocco", category: "premium", premium: true },
  { label: "🌍 AI World Cup forecast", query: "Who is most likely to win the World Cup?", category: "premium", premium: true },
  { label: "📊 Compare teams", query: "Compare France and Spain", category: "general" },
];
