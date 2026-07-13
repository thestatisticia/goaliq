"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CopilotPanel } from "@/components/CopilotPanel";
import type { CopilotContext } from "@/lib/types";

export function CopilotPageClient({ context }: { context?: CopilotContext }) {
  return (
    <div className="relative mx-auto max-w-3xl">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-goaliq-muted transition-colors hover:text-goaliq-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <CopilotPanel context={context} />
    </div>
  );
}
