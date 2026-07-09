import { serverEnv } from "./server-env";

const BASE_URL = "https://v3.football.api-sports.io";

/** Keys marked exhausted for this server process (daily quota hit). */
const exhaustedKeys = new Set<string>();
/** Keys rejected for account suspension or invalid access. */
const blockedKeys = new Set<string>();
let exhaustedSinceUtcDate: string | null = null;

function maybeResetExhaustedKeys(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (exhaustedSinceUtcDate && exhaustedSinceUtcDate < today) {
    exhaustedKeys.clear();
    blockedKeys.clear();
    exhaustedSinceUtcDate = null;
  }
}

function parseKeysFromEnv(): string[] {
  const keys: string[] = [];

  const list = serverEnv("API_FOOTBALL_KEYS");
  if (list) {
    keys.push(
      ...list
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k && !keys.includes(k))
    );
  }

  for (const envName of ["API_FOOTBALL_KEY", "API_FOOTBALL_KEY_2", "API_FOOTBALL_KEY_3"]) {
    const value = serverEnv(envName);
    if (value && !keys.includes(value)) {
      keys.push(value);
    }
  }

  return keys;
}

/** All configured keys that are not exhausted in this process. */
export function getActiveApiFootballKeys(): string[] {
  maybeResetExhaustedKeys();
  return parseKeysFromEnv().filter((k) => !exhaustedKeys.has(k) && !blockedKeys.has(k));
}

export function getApiFootballKeyCount(): number {
  return parseKeysFromEnv().length;
}

export function markApiKeyExhausted(key: string): void {
  exhaustedKeys.add(key);
  exhaustedSinceUtcDate = new Date().toISOString().slice(0, 10);
  console.warn(`[api-football] Key …${key.slice(-6)} hit daily limit — trying next key if available`);
}

export function isRateLimitPayload(errors: unknown): boolean {
  return /request limit|rate limit|daily limit/i.test(JSON.stringify(errors ?? ""));
}

export function isAccountBlockedPayload(errors: unknown): boolean {
  const s = JSON.stringify(errors ?? "").toLowerCase();
  return /suspended|invalid api key|account has been disabled|forbidden/.test(s);
}

export function markApiKeyBlocked(key: string, reason?: string): void {
  blockedKeys.add(key);
  console.warn(`[api-football] Key …${key.slice(-6)} blocked: ${reason ?? "account access denied"}`);
}

export type ApiFootballHealth = {
  configured: boolean;
  activeKeys: number;
  totalKeys: number;
  status: "ok" | "quota_exhausted" | "suspended" | "not_configured";
  message: string;
  requestsToday?: number;
  dailyLimit?: number;
};

let healthCache: { at: number; value: ApiFootballHealth } | null = null;

/** Probe API-Football /status — cached 5 min. */
export async function getApiFootballHealth(): Promise<ApiFootballHealth> {
  if (healthCache && Date.now() - healthCache.at < 5 * 60_000) return healthCache.value;

  const keys = parseKeysFromEnv();
  if (!keys.length) {
    const value: ApiFootballHealth = {
      configured: false,
      activeKeys: 0,
      totalKeys: 0,
      status: "not_configured",
      message: "API_FOOTBALL_KEY is not set — team statistics and goal events need API-Football.",
    };
    healthCache = { at: Date.now(), value };
    return value;
  }

  maybeResetExhaustedKeys();
  let quotaHit = false;
  let suspended = false;
  let requestsToday: number | undefined;
  let dailyLimit: number | undefined;

  for (const key of keys) {
    try {
      const res = await fetch(`${BASE_URL}/status`, {
        headers: { "x-apisports-key": key },
        next: { revalidate: 300 },
      });
      const json = await res.json();
      if (json.errors && Object.keys(json.errors).length > 0) {
        if (isAccountBlockedPayload(json.errors)) {
          markApiKeyBlocked(key, JSON.stringify(json.errors));
          suspended = true;
          continue;
        }
        if (isRateLimitPayload(json.errors)) {
          markApiKeyExhausted(key);
          quotaHit = true;
          continue;
        }
      }
      const req = json.response?.requests;
      if (req) {
        requestsToday = req.current ?? requestsToday;
        dailyLimit = req.limit_day ?? dailyLimit;
        if (dailyLimit && requestsToday != null && requestsToday >= dailyLimit) {
          markApiKeyExhausted(key);
          quotaHit = true;
        }
      }
    } catch {
      /* ignore probe errors */
    }
  }

  const active = getActiveApiFootballKeys().length;
  let status: ApiFootballHealth["status"] = "ok";
  let message = `API-Football ready (${active}/${keys.length} keys active).`;

  if (suspended && active === 0) {
    status = "suspended";
    message =
      "API-Football account is suspended — check dashboard.api-football.com. Scores work via football-data.org; events and team stats need a working API-Football key.";
  } else if (quotaHit && active === 0) {
    status = "quota_exhausted";
    message = `API-Football daily quota used (${requestsToday ?? "?"} / ${dailyLimit ?? 100} requests). Resets at UTC midnight.`;
  } else if (active === 0) {
    status = "quota_exhausted";
    message = "No active API-Football keys — statistics and events are unavailable until quota resets or a new key is added.";
  }

  const value: ApiFootballHealth = {
    configured: true,
    activeKeys: active,
    totalKeys: keys.length,
    status,
    message,
    requestsToday,
    dailyLimit,
  };
  healthCache = { at: Date.now(), value };
  return value;
}

export async function footballApiRequest<T>(endpoint: string): Promise<T> {
  const keys = getActiveApiFootballKeys();
  if (!keys.length) {
    const total = getApiFootballKeyCount();
    if (total === 0) throw new Error("API_FOOTBALL_KEY is not set");
    throw new Error("API_RATE_LIMIT");
  }

  let lastError: Error | null = null;

  for (const key of keys) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { "x-apisports-key": key },
        next: { revalidate: 60 },
      });

      if (!res.ok) {
        lastError = new Error(`API-Football error: ${res.status}`);
        continue;
      }

      const json = await res.json();
      if (json.errors && Object.keys(json.errors).length > 0) {
        if (isAccountBlockedPayload(json.errors)) {
          markApiKeyBlocked(key, JSON.stringify(json.errors));
          lastError = new Error("API_ACCOUNT_SUSPENDED");
          continue;
        }
        if (isRateLimitPayload(json.errors)) {
          markApiKeyExhausted(key);
          lastError = new Error("API_RATE_LIMIT");
          continue;
        }
        throw new Error(`API-Football: ${JSON.stringify(json.errors)}`);
      }

      return json.response as T;
    } catch (e) {
      if ((e as Error).message.startsWith("API-Football:")) throw e;
      lastError = e as Error;
    }
  }

  throw lastError ?? new Error("API_RATE_LIMIT");
}
