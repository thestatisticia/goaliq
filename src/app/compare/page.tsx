"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, GitCompare, Loader2, Search } from "lucide-react";
import type { TeamComparisonData } from "@/lib/match-briefing";
import { PredictionShareCard } from "@/components/PredictionShareCard";

interface WcTeam {
  id: number;
  name: string;
  logo: string;
}

export default function ComparePage() {
  const [teams, setTeams] = useState<WcTeam[]>([]);
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [comparison, setComparison] = useState<TeamComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setTeams(d.teams ?? []))
      .catch(() => setTeams([]));
  }, []);

  async function compare() {
    if (!team1 || !team2) return;
    setLoading(true);
    setError(null);
    setComparison(null);
    try {
      const res = await fetch(
        `/api/compare?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Compare failed");
      setComparison(data.comparison);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-goaliq-accent">
          <GitCompare className="h-5 w-5" />
          <p className="text-xs font-semibold uppercase tracking-widest">Team Compare</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AI Team Comparison</h1>
        <p className="text-sm text-goaliq-muted max-w-xl">
          Side-by-side form, goals, and win probability — grounded in live World Cup data.
        </p>
      </header>

      <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TeamSelect label="Team 1" teams={teams} value={team1} onChange={setTeam1} />
          <TeamSelect label="Team 2" teams={teams} value={team2} onChange={setTeam2} />
        </div>
        <button
          onClick={compare}
          disabled={loading || !team1 || !team2 || team1 === team2}
          className="w-full sm:w-auto rounded-lg bg-goaliq-accent px-6 py-2.5 text-sm font-semibold text-goaliq-bg hover:bg-sky-300 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Compare teams
        </button>
        {error && <p className="text-sm text-goaliq-live">{error}</p>}
      </div>

      {comparison && (
        <div className="space-y-4">
          <div className="rounded-xl border border-goaliq-border bg-goaliq-card p-5">
            <div className="flex items-center justify-center gap-8 mb-6">
              <TeamBadge team={comparison.team1} />
              <span className="text-2xl font-bold text-goaliq-muted">vs</span>
              <TeamBadge team={comparison.team2} />
            </div>

            <div className="space-y-3">
              {comparison.metrics.map((m) => (
                <div key={m.label} className="grid grid-cols-3 gap-2 text-sm items-center py-2 border-b border-goaliq-border/50 last:border-0">
                  <span className={m.edge === "team1" ? "font-semibold text-goaliq-accent" : ""}>{m.team1}</span>
                  <span className="text-center text-xs text-goaliq-muted uppercase tracking-wide">{m.label}</span>
                  <span className={`text-right ${m.edge === "team2" ? "font-semibold text-goaliq-gold" : ""}`}>{m.team2}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-sm text-slate-300">
              <span className="text-goaliq-gold font-semibold">AI verdict:</span> {comparison.verdict}
            </p>
            <p className="text-center text-xs text-goaliq-muted mt-1">{comparison.h2hSummary}</p>
          </div>

          {comparison.winProb && (
            <PredictionShareCard
              homeTeam={comparison.team1.name}
              awayTeam={comparison.team2.name}
              percentHome={comparison.winProb.team1}
              percentAway={comparison.winProb.team2}
              percentDraw={comparison.winProb.draw}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TeamSelect({
  label,
  teams,
  value,
  onChange,
}: {
  label: string;
  teams: WcTeam[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-goaliq-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-goaliq-border bg-black/30 px-3 py-2.5 text-sm"
      >
        <option value="">Select team…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TeamBadge({ team }: { team: { name: string; logo: string } }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {team.logo ? (
        <Image src={team.logo} alt="" width={56} height={56} className="rounded-full" unoptimized />
      ) : (
        <div className="h-14 w-14 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold">
          {team.name[0]}
        </div>
      )}
      <span className="font-semibold text-sm text-center max-w-[120px]">{team.name}</span>
    </div>
  );
}
