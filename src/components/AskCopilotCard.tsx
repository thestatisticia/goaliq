import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";
import type { CopilotContext } from "@/lib/types";

export function AskCopilotCard({ context }: { context: CopilotContext }) {
  const params = new URLSearchParams();
  if (context.matchId) params.set("matchId", String(context.matchId));
  if (context.homeTeam) params.set("home", context.homeTeam);
  if (context.awayTeam) params.set("away", context.awayTeam);
  if (context.score) params.set("score", context.score);
  if (context.status) params.set("status", context.status);

  const href = `/copilot?${params.toString()}`;

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-xl border border-goaliq-border bg-goaliq-card p-5 transition-colors hover:border-goaliq-accent/40 hover:bg-goaliq-card/80"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-goaliq-accent/20">
          <MessageSquare className="h-5 w-5 text-goaliq-accent" />
        </div>
        <div>
          <p className="font-semibold text-sm">Ask GOALIQ AI</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Win chances, H2H, and match questions on the Copilot page
          </p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-goaliq-accent shrink-0" />
    </Link>
  );
}
