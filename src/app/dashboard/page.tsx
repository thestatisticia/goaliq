import { DashboardTabs } from "@/components/DashboardTabs";
import { StatsBar } from "@/components/StatsBar";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-goaliq-accent">Tournament Hub</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">FIFA World Cup 2026</h1>
        <p className="max-w-2xl text-sm text-goaliq-muted sm:text-base">
          Live scores, today&apos;s kickoffs, upcoming fixtures, and completed results — from football-data.org
        </p>
      </header>

      <StatsBar />

      <section className="rounded-2xl border border-goaliq-border bg-goaliq-card/50 p-4 shadow-card sm:p-6">
        <DashboardTabs />
      </section>
    </div>
  );
}
