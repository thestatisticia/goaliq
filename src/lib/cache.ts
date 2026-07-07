const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    return null;
  }
  return entry.data as T;
}

/** Return last cached value even after TTL — used when APIs rate-limit. */
export function getCachedStale<T>(key: string): T | null {
  const entry = cache.get(key);
  return entry ? (entry.data as T) : null;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** TTL helpers — football-data.org allows 10 req/min; keep live data fresh */
export const CACHE_TTL = {
  live: 15_000,
  today: 30_000,
  fixtures: 2 * 60_000,
  standings: 5 * 60_000,
  matchDetail: 20_000,
  h2h: 30 * 60_000,
  predictions: 30 * 60_000,
  teamForm: 10 * 60_000,
  tournament: 15 * 60_000,
} as const;
