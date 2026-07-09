"use client";

import { useEffect, useState } from "react";
import { Newspaper, Loader2 } from "lucide-react";
import type { DailyDigestData } from "@/lib/match-briefing";

export function DailyDigest() {
  const [digest, setDigest] = useState<DailyDigestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/digest", { cache: "no-store" })
      .then((r) => r.json())
      .then(setDigest)
      .catch(() => setDigest(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-goaliq-borderSubtle bg-goaliq-card p-4 flex items-center gap-2 text-sm text-goaliq-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading today&apos;s brief…
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="rounded-xl border border-goaliq-borderSubtle bg-goaliq-card p-5 shadow-card">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface p-2">
          <Newspaper className="h-5 w-5 text-goaliq-fg" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-goaliq-muted">Daily AI Digest</p>
          <h2 className="text-lg font-bold text-goaliq-fg">{digest.headline}</h2>
          <p className="text-xs text-goaliq-muted mt-0.5">{digest.date}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {digest.sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-goaliq-borderSubtle bg-goaliq-surface p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-goaliq-fg mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1.5 text-sm text-goaliq-fg/85">
              {section.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
