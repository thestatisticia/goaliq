"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Match } from "@/lib/types";
import { formatMatchTime, regulationScore } from "@/lib/utils";
import { dashboardApiUrl } from "@/lib/dashboard-client";
import { Radio } from "lucide-react";

export function LandingLiveTicker() {
  const [live, setLive] = useState<Match[]>([]);
  const [today, setToday] = useState<Match[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [teams, setTeams] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(dashboardApiUrl(), { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) return;
        setLive(data.live ?? []);
        setToday(data.fixtures ?? []);
        setTotal(data.total ?? null);
        setTeams(data.teams?.length ?? null);
      } catch {
        /* silent — ticker hides if empty */
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const items: { key: string; label: string; href: string }[] = [];

  for (const m of live.slice(0, 4)) {
    const reg = regulationScore(m);
    const score =
      reg.home != null && reg.away != null ? `${reg.home}–${reg.away}` : "–";
    items.push({
      key: `live-${m.fixture.id}`,
      label: `${m.teams.home.name} ${score} ${m.teams.away.name} · ${formatMatchTime(m.fixture.status.short, m.fixture.status.elapsed)}`,
      href: `/match/${m.fixture.id}`,
    });
  }

  for (const m of today.slice(0, 4 - items.length)) {
    const time = new Date(m.fixture.date).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    items.push({
      key: `today-${m.fixture.id}`,
      label: `${m.teams.home.name} vs ${m.teams.away.name} · Today ${time}`,
      href: `/match/${m.fixture.id}`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="border-b border-goaliq-border/80 bg-goaliq-card/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-goaliq-live">
          {live.length > 0 ? (
            <>
              <Radio className="h-3.5 w-3.5" />
              Live
            </>
          ) : (
            "Today"
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="truncate text-sm text-slate-300 transition-colors hover:text-goaliq-accent"
            >
              {item.label}
            </Link>
          ))}
        </div>
        {(total != null || teams != null) && (
          <span className="hidden shrink-0 text-xs text-goaliq-muted sm:inline">
            {teams ?? 48} teams · {total ?? 104} matches
          </span>
        )}
      </div>
    </div>
  );
}
