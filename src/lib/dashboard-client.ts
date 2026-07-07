/** Client-side URL for dashboard API with the user's local timezone. */
export function dashboardApiUrl(): string {
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  return `/api/dashboard?tz=${encodeURIComponent(tz)}`;
}
