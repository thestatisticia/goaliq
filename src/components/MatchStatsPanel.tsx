"use client";

import type { MatchEvent, SummaryRow, TeamMatchStatistics } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MatchEventsList({
  events,
  derived,
}: {
  events: MatchEvent[];
  derived?: boolean;
}) {
  if (!events.length) {
    return (
      <p className="text-sm text-gray-500 py-2">
        Goal scorers, cards, and subs will appear here when available from the data provider.
      </p>
    );
  }

  const goals = events.filter((e) => e.type === "Goal");
  const penalties = events.filter((e) => e.type === "Penalty");
  const cards = events.filter((e) => e.type === "Card");
  const subs = events.filter((e) => e.type === "subst");
  const info = events.filter((e) => e.type === "Info");

  return (
    <div className="space-y-4">
      {derived && info.length > 0 && (
        <p className="text-xs text-gray-500 mb-2">
          Score timeline from match data — individual scorers require API-Football.
        </p>
      )}
      {penalties.length > 0 && (
        <EventGroup title="Penalty shootout" events={penalties} icon="🎯" penaltyMode />
      )}
      {goals.length > 0 && <EventGroup title="Goals" events={goals} icon="⚽" />}
      {cards.length > 0 && <EventGroup title="Cards" events={cards} icon="🟨" />}
      {subs.length > 0 && <EventGroup title="Substitutions" events={subs} icon="🔄" />}
      {goals.length === 0 && penalties.length === 0 && cards.length === 0 && subs.length === 0 && (
        <div className="space-y-2">
          {(info.length ? info : events).map((e, i) => (
            <EventRow key={i} event={e} infoMode={e.type === "Info"} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventGroup({
  title,
  events,
  icon,
  penaltyMode,
}: {
  title: string;
  events: MatchEvent[];
  icon: string;
  penaltyMode?: boolean;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {icon} {title}
      </h4>
      <div className="space-y-1.5">
        {events.map((e, i) => (
          <EventRow key={i} event={e} penaltyMode={penaltyMode} index={i} />
        ))}
      </div>
    </div>
  );
}

function EventRow({
  event,
  penaltyMode,
  infoMode,
  index,
}: {
  event: MatchEvent;
  penaltyMode?: boolean;
  infoMode?: boolean;
  index?: number;
}) {
  const minute = penaltyMode
    ? `#${(index ?? 0) + 1}`
    : event.time.extra
      ? `${event.time.elapsed}+${event.time.extra}'`
      : `${event.time.elapsed}'`;

  const isCard = event.type === "Card";
  const isMissed = /missed/i.test(event.detail);
  const cardColor =
    event.detail.includes("Red") ? "text-goaliq-live" : event.detail.includes("Yellow") ? "text-yellow-400" : "";

  if (infoMode) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500 w-10 shrink-0 font-mono text-xs">{minute}</span>
        <span className="font-medium text-gray-200">{event.player.name}</span>
        <span className="text-gray-400 text-xs ml-auto tabular-nums">{event.detail}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500 w-10 shrink-0 font-mono text-xs">{minute}</span>
      <span className="text-gray-400 w-24 truncate text-xs">{event.team.name}</span>
      <span
        className={cn(
          "font-medium",
          isCard && cardColor,
          penaltyMode && (isMissed ? "text-goaliq-live line-through" : "text-goaliq-success")
        )}
      >
        {event.player.name}
      </span>
      <span className="text-gray-500 text-xs ml-auto">{isMissed ? "Missed" : event.detail}</span>
    </div>
  );
}

const KEY_STATS = [
  "Ball Possession",
  "Shots On Goal",
  "Shots on Goal",
  "Total Shots",
  "Corner Kicks",
  "Fouls",
  "Yellow Cards",
  "Red Cards",
  "Goalkeeper Saves",
  "Offsides",
];

export function MatchSummaryGrid({
  summary,
  homeName,
  awayName,
}: {
  summary: SummaryRow[];
  homeName: string;
  awayName: string;
}) {
  if (!summary.length) {
    return (
      <p className="text-sm text-gray-500 py-2">
        Match context will appear here when standings or score data is available.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 text-xs text-gray-500 mb-1">
        <span className="text-right truncate">{homeName}</span>
        <span className="text-center">Stat</span>
        <span className="truncate">{awayName}</span>
      </div>
      {summary.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-3 items-center text-sm py-1 border-b border-goaliq-border/30 gap-1"
        >
          <span className="text-right text-gray-200 text-xs sm:text-sm">{row.home}</span>
          <span className="text-center text-xs text-gray-500">{row.label}</span>
          <span className="text-gray-200 text-xs sm:text-sm">{row.away}</span>
        </div>
      ))}
      <p className="text-xs text-gray-600 pt-1">
        Built from football-data.org scores and standings — possession and shots need API-Football.
      </p>
    </div>
  );
}

export function MatchStatisticsGrid({ statistics }: { statistics: TeamMatchStatistics[] }) {
  if (!statistics.length) {
    return (
      <p className="text-sm text-gray-500 py-2">
        Corners, possession, and shot stats load via API-Football when quota is available.
      </p>
    );
  }

  const home = statistics[0];
  const away = statistics[1];
  if (!away) return null;

  const types = new Set<string>();
  for (const s of [...home.statistics, ...away.statistics]) {
    if (KEY_STATS.some((k) => s.type.toLowerCase().includes(k.toLowerCase().split(" ")[0]))) {
      types.add(s.type);
    }
  }
  const typeList = Array.from(types);
  const ordered = KEY_STATS.filter((k) => types.has(k) || typeList.some((t) => t.includes(k.split(" ")[0])));

  const rows =
    ordered.length > 0
      ? ordered
      : ["Ball Possession", "Corner Kicks", "Total Shots", "Shots On Goal", "Fouls", "Yellow Cards"];

  const getVal = (team: TeamMatchStatistics, type: string) => {
    const exact = team.statistics.find((s) => s.type === type);
    if (exact) return exact.value;
    const fuzzy = team.statistics.find((s) => s.type.toLowerCase().includes(type.toLowerCase().split(" ")[0]));
    return fuzzy?.value ?? "—";
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 text-xs text-gray-500 mb-1">
        <span className="text-right truncate">{home.team.name}</span>
        <span className="text-center">Stat</span>
        <span className="truncate">{away.team.name}</span>
      </div>
      {rows.map((type) => (
        <div key={type} className="grid grid-cols-3 items-center text-sm py-1 border-b border-goaliq-border/30">
          <span className="text-right font-semibold tabular-nums">{getVal(home, type)}</span>
          <span className="text-center text-xs text-gray-500">{type}</span>
          <span className="font-semibold tabular-nums">{getVal(away, type)}</span>
        </div>
      ))}
    </div>
  );
}
