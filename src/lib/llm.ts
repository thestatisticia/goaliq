import { serverEnv } from "./server-env";

export const LLM_MODELS = {
  groq: [
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Groq)", provider: "groq" as const, free: true },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Groq)", provider: "groq" as const, free: true },
  ],
  gemini: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "gemini" as const, free: true },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "gemini" as const, free: true },
  ],
} as const;

export type LLMProvider = "groq" | "gemini" | "fallback";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function getAvailableModels() {
  const models = [];
  if (serverEnv("GROQ_API_KEY")) models.push(...LLM_MODELS.groq);
  if (serverEnv("GEMINI_API_KEY")) models.push(...LLM_MODELS.gemini);
  return models;
}

export function getDefaultModel(): { id: string; provider: LLMProvider } {
  if (serverEnv("GROQ_API_KEY")) return { id: "llama-3.1-8b-instant", provider: "groq" };
  if (serverEnv("GEMINI_API_KEY")) return { id: "gemini-2.0-flash", provider: "gemini" };
  return { id: "fallback", provider: "fallback" };
}

async function callGroq(model: string, messages: LLMMessage[]): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`Groq error: ${await res.text()}`);
  const json = await res.json();
  return json.choices[0].message.content;
}

async function callGemini(model: string, messages: LLMMessage[]): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${serverEnv("GEMINI_API_KEY")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini.";
}

export async function chatCompletion(
  messages: LLMMessage[],
  modelId?: string,
  provider?: LLMProvider
): Promise<{ reply: string; model: string; provider: LLMProvider }> {
  const selected = modelId && provider && provider !== "fallback"
    ? { id: modelId, provider }
    : getDefaultModel();

  if (selected.provider === "groq" && serverEnv("GROQ_API_KEY")) {
    const reply = await callGroq(selected.id, messages);
    return { reply, model: selected.id, provider: "groq" };
  }

  if (selected.provider === "gemini" && serverEnv("GEMINI_API_KEY")) {
    const reply = await callGemini(selected.id, messages);
    return { reply, model: selected.id, provider: "gemini" };
  }

  if (serverEnv("GROQ_API_KEY")) {
    const reply = await callGroq("llama-3.1-8b-instant", messages);
    return { reply, model: "llama-3.1-8b-instant", provider: "groq" };
  }

  if (serverEnv("GEMINI_API_KEY")) {
    const reply = await callGemini("gemini-2.0-flash", messages);
    return { reply, model: "gemini-2.0-flash", provider: "gemini" };
  }

  throw new Error("NO_LLM_KEY");
}

export const COPILOT_SYSTEM_PROMPT = `You are GOALIQ AI, the friendly assistant for GOALIQ — a World Cup 2026 intelligence platform for the Injective Global Cup hackathon.

PERSONALITY (always follow):
- Address the user as "ninja" naturally (e.g. "Hey ninja!", "Yeah ninja,", "Good question ninja —").
- Be warm, conversational, and human — not robotic one-liners. React to what they asked emotionally when appropriate (sympathy when a team is out, excitement for a big win).
- Keep answers accurate but friendly. A short opener + the facts + an optional follow-up question works well.

CRITICAL RULES:
- ONLY use match data provided in the LIVE DATA section below. NEVER invent scores, dates, or head-to-head records.
- If head-to-head data is provided, quote it exactly. If not provided, say you don't have it — do NOT guess from training data.
- If a match shows "not played yet" or null scores, say it is upcoming — do not fabricate a result.
- NEVER execute token swaps, trades, or transfers. GOALIQ cannot swap USDC to INJ.
- The Injective faucet gives free testnet INJ — it is NOT a swap/DEX.

You help ninjas with:
- Live scores, fixtures, and match results
- Head-to-head stats (when provided in context)
- Wallet funding (Circle faucet, Injective faucet, Fund Wallet page)
- x402 pay-per-insight intelligence (from 0.02 USDC)

Be accurate first, friendly second. Never skip the facts — just deliver them like a mate who loves football.`;
