import { serverEnv } from "./server-env";

/** Calendar helpers — server runs UTC on Vercel; clients pass IANA timezone via ?tz= */

export function resolveTimeZone(tz?: string | null): string {
  const candidate = tz?.trim();
  if (candidate) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: candidate });
      return candidate;
    } catch {
      /* invalid IANA name */
    }
  }
  const envTz = serverEnv("WC_TIMEZONE");
  if (envTz) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: envTz });
      return envTz;
    } catch {
      /* fall through */
    }
  }
  return "UTC";
}

/** YYYY-MM-DD in the given IANA timezone. */
export function formatDateInTimeZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function shiftCalendarDate(isoDate: string, deltaDays: number, timeZone: string): string {
  const [y, m, day] = isoDate.split("-").map(Number);
  const ref = new Date(Date.UTC(y, m - 1, day + deltaDays, 12, 0, 0));
  return formatDateInTimeZone(ref, timeZone);
}

export function dateWindowForTimeZone(timeZone: string): string[] {
  const today = formatDateInTimeZone(new Date(), timeZone);
  return [
    shiftCalendarDate(today, -1, timeZone),
    today,
    shiftCalendarDate(today, 1, timeZone),
  ];
}
