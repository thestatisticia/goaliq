import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLive(status: string): boolean {
  return ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(status);
}

export function isPenaltyShootout(status: string): boolean {
  return status === "P";
}

/** Regulation / ET score line (before shootout). */
export function regulationScore(match: {
  goals: { home: number | null; away: number | null; extraTime?: { home: number | null; away: number | null } | null };
}): { home: number | null; away: number | null } {
  const et = match.goals.extraTime;
  if (et && (et.home != null || et.away != null)) return { home: et.home, away: et.away };
  return { home: match.goals.home, away: match.goals.away };
}

export function hasPenaltyScore(match: {
  goals?: { penalties?: { home: number | null; away: number | null } | null };
}): boolean {
  const p = match.goals?.penalties;
  if (p == null || p.home == null || p.away == null) return false;
  // Shootouts cannot end tied — ignore bad/stale API data (e.g. 2–2 pens)
  return p.home !== p.away;
}

export function decidedOnPenalties(match: {
  goals: {
    home: number | null;
    away: number | null;
    extraTime?: { home: number | null; away: number | null } | null;
    penalties?: { home: number | null; away: number | null } | null;
  };
  fixture: { status: { short: string } };
  teams: { home: { winner?: boolean | null }; away: { winner?: boolean | null } };
}): boolean {
  if (match.fixture.status.short === "PEN") return true;
  if (hasPenaltyScore(match)) return true;
  const reg = regulationScore(match);
  const hasWinner =
    match.teams.home.winner === true ||
    match.teams.away.winner === true;
  return (
    hasWinner &&
    reg.home != null &&
    reg.away != null &&
    reg.home === reg.away &&
    match.fixture.status.short === "FT"
  );
}

export function formatMatchScore(match: {
  goals: {
    home: number | null;
    away: number | null;
    extraTime?: { home: number | null; away: number | null } | null;
    penalties?: { home: number | null; away: number | null } | null;
  };
  fixture: { status: { short: string } };
  teams?: { home: { winner?: boolean | null }; away: { winner?: boolean | null } };
}): { main: string; regulation?: string; penalties?: string; suffix?: string } {
  const reg = regulationScore(match);
  const pens = match.goals.penalties;
  const onPens = decidedOnPenalties({
    goals: match.goals,
    fixture: match.fixture,
    teams: match.teams ?? { home: {}, away: {} },
  });
  const validPens = hasPenaltyScore({ goals: match.goals });
  const inShootout = isPenaltyShootout(match.fixture.status.short);

  if (onPens || inShootout) {
    const regLine =
      reg.home != null && reg.away != null ? `${reg.home}–${reg.away}` : null;
    const penLine =
      validPens && pens ? `${pens.home}–${pens.away}` : null;

    if (penLine && regLine) {
      return { main: regLine, regulation: regLine, penalties: penLine, suffix: `(${penLine} pens)` };
    }
    if (penLine) {
      return { main: penLine, penalties: penLine };
    }
    if (regLine) {
      const finished = isFinishedStatus(match.fixture.status.short) || match.fixture.status.short === "PEN";
      return {
        main: regLine,
        regulation: regLine,
        suffix: finished ? "(won on pens)" : inShootout ? "(shootout)" : undefined,
      };
    }
  }

  if (reg.home != null && reg.away != null) {
    return { main: `${reg.home}–${reg.away}` };
  }
  return { main: "–" };
}

export function isFinishedStatus(status: string): boolean {
  return ["FT", "AET", "PEN"].includes(status);
}

export function isScheduledStatus(status: string): boolean {
  return ["NS", "TBD"].includes(status);
}

/** Only show scores once a match has started or finished. */
export function shouldShowScore(status: string): boolean {
  return isLive(status) || isFinishedStatus(status) || ["HT", "ET", "P"].includes(status);
}

export function formatMatchTime(status: string, elapsed: number | null): string {
  if (status === "NS") return "Upcoming";
  if (status === "FT") return "Full Time";
  if (status === "HT") return "Half Time";
  if (status === "ET") return "Extra Time";
  if (status === "P") return "Penalties";
  if (status === "PEN") return "Finished (pens)";
  if (elapsed) return `${elapsed}'`;
  return status;
}
