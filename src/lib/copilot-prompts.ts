/** One-click suggested prompts for the copilot UI. */

export interface CopilotPromptChip {
  label: string;
  query: string;
  premium?: boolean;
}

export const COPILOT_PROMPT_CHIPS: CopilotPromptChip[] = [
  { label: "🏆 Today's matches", query: "What World Cup matches are today?" },
  { label: "⚽ Who's winning?", query: "Who is winning right now?" },
  { label: "📊 Live scores", query: "Which matches are live now?" },
  { label: "📅 Next match", query: "What's the next World Cup match?" },
  { label: "📋 Knockout bracket", query: "Show the knockout bracket" },
  { label: "🏅 Who qualified?", query: "Which teams have qualified for the knockout stage?" },
  { label: "🌍 Who's still in?", query: "Which teams are left in the tournament?" },
  { label: "🇳🇴 Did Norway advance?", query: "Did Norway proceed to the next round?" },
  { label: "📈 Group standings", query: "Show the group standings" },
  { label: "🔥 Team form", query: "How has France performed recently?" },
  { label: "🤖 Predict a match", query: "Analyze France vs Morocco", premium: true },
  { label: "📊 Compare teams", query: "Compare France and Spain" },
];
