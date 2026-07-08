import { serverEnv } from "./server-env";

const BASE_URL = "https://v3.football.api-sports.io";

/** Keys marked exhausted for this server process (daily quota hit). */
const exhaustedKeys = new Set<string>();

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
  return parseKeysFromEnv().filter((k) => !exhaustedKeys.has(k));
}

export function getApiFootballKeyCount(): number {
  return parseKeysFromEnv().length;
}

export function markApiKeyExhausted(key: string): void {
  exhaustedKeys.add(key);
  console.warn(`[api-football] Key …${key.slice(-6)} hit daily limit — trying next key if available`);
}

export function isRateLimitPayload(errors: unknown): boolean {
  return /request limit|rate limit/i.test(JSON.stringify(errors ?? ""));
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
