/** Placeholder values from .env.example — treat as unset. */
const PLACEHOLDERS = new Set(["your_football_data_key_here", "your_api_key_here"]);

/**
 * Read a server env var at request time.
 * Uses bracket access so Next.js does not bake in `undefined` at build when
 * vars are added in Vercel after the first deploy.
 */
export function serverEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (!value || PLACEHOLDERS.has(value)) return undefined;
  return value;
}

export function serverEnvStatus() {
  return {
    footballDataKey: serverEnv("FOOTBALL_DATA_KEY") !== undefined,
    apiFootballKey: serverEnv("API_FOOTBALL_KEY") !== undefined || serverEnv("API_FOOTBALL_KEY_2") !== undefined,
    groqKey: serverEnv("GROQ_API_KEY") !== undefined,
    geminiKey: serverEnv("GEMINI_API_KEY") !== undefined,
  };
}
