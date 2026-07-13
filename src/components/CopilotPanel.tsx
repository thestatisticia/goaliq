"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Bot, Coins } from "lucide-react";
import type { ChatMessage, CopilotContext } from "@/lib/types";
import { useWallet } from "@/context/WalletContext";
import { usePaymentConfig } from "@/context/PaymentConfigContext";
import { cn } from "@/lib/utils";
import { MIN_PREMIUM_USDC, isPremiumQuery, getTierForQuery } from "@/lib/payments";
import { fetchX402Resource, x402PremiumUrl } from "@/lib/x402-client";
import { savePredictionReceipt } from "@/lib/prediction-receipts";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { COPILOT_FEATURED_CHIPS } from "@/lib/copilot-prompts";

interface CopilotPanelProps {
  context?: CopilotContext;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

const QUICK_PROMPTS = [
  { label: "Today's World Cup matches", query: COPILOT_FEATURED_CHIPS[0].query },
  { label: "Teams still in the tournament", query: COPILOT_FEATURED_CHIPS[1].query },
  { label: "Head-to-head statistics", query: "Head to head France vs Spain", premium: true },
  { label: "Who's winning right now", query: "Who is winning right now?" },
  { label: "Show the knockout bracket", query: "Show the knockout bracket" },
];

export function CopilotPanel({ context = {} }: CopilotPanelProps) {
  const wallet = useWallet();
  const { paymentsEnabled, paymentWallet } = usePaymentConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey ninja! I'm your World Cup intelligence copilot.\n\n• **Free:** live coverage, today's matches, tournament chat\n• **Premium:** head-to-head stats, win chances, and tactical breakdowns from **" +
        MIN_PREMIUM_USDC +
        " USDC** — win chances, tactical breakdowns, forecasts",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payingUsdc, setPayingUsdc] = useState<number | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [llmReady, setLlmReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const inConversation = messages.some((m) => m.role === "user");
  const matchLabel =
    context?.homeTeam && context?.awayTeam ? `${context.homeTeam} vs ${context.awayTeam}` : null;

  useEffect(() => {
    fetch("/api/copilot")
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models ?? []);
        setLlmReady(data.llmConfigured);
        if (data.default?.id) setSelectedModel(data.default.id);
      });
  }, []);

  useEffect(() => {
    if (inConversation) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, inConversation]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading || paying) return;

    const needsPayment = isPremiumQuery(text) && paymentsEnabled;
    const tier = getTierForQuery(text);

    if (needsPayment) {
      if (!wallet.isConnected || !wallet.evmAddress) {
        await wallet.connect();
        return;
      }
      const bal = parseFloat(wallet.usdcBalance ?? "0");
      if (bal < tier.usdc) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() },
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `This is a **${tier.label}** (${tier.usdc} USDC). You need at least ${tier.usdc} USDC — visit **Fund Wallet** to top up testnet USDC.`,
            timestamp: new Date(),
          },
        ]);
        setInput("");
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let txHash: string | undefined;

    try {
      if (needsPayment && wallet.evmAddress && paymentWallet) {
        setPaying(true);
        setPayingUsdc(tier.usdc);
        const { data: x402Data, txHash: hash } = await fetchX402Resource<{
          reply: string;
          tier?: string;
          price?: string;
        }>(x402PremiumUrl("/copilot"), {
          evmAddress: wallet.evmAddress as `0x${string}`,
          payTo: paymentWallet,
          amountUsdc: tier.usdc,
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, context }),
          },
        });

        txHash = hash;
        await wallet.refreshBalance();
        setPaying(false);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: stripPaymentNoise(x402Data.reply ?? "No response."),
            timestamp: new Date(),
          },
        ]);

        savePredictionReceipt({
          matchId: context.matchId ?? null,
          homeTeam: context.homeTeam ?? "Copilot",
          awayTeam: context.awayTeam ?? tier.label,
          type: "copilot",
          txHash: hash,
          evmAddress: wallet.evmAddress,
          price: x402Data.price ?? `${tier.usdc} USDC`,
          paidVia: "x402",
          tier: tier.id,
        });

        return;
      }

      const model = models.find((m) => m.id === selectedModel);
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context,
          modelId: selectedModel,
          provider: model?.provider,
          txHash,
          wallet: wallet.isConnected
            ? { evmAddress: wallet.evmAddress, injBalance: wallet.injBalance, usdcBalance: wallet.usdcBalance }
            : null,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: stripPaymentNoise(data.reply ?? "No response."),
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${(err as Error).message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      setPaying(false);
      setPayingUsdc(null);
    }
  }

  const composer = (
    <Composer
      input={input}
      loading={loading}
      paying={paying}
      inputRef={inputRef}
      onInputChange={setInput}
      onSend={() => send()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          send();
        }
      }}
    />
  );

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-goaliq-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span>{llmReady ? "AI enabled" : "Basic responses"}</span>
          {matchLabel && (
            <>
              <span className="text-goaliq-border">·</span>
              <span>{matchLabel}{context?.score ? ` · ${context.score}` : ""}</span>
            </>
          )}
          {paymentsEnabled && (
            <>
              <span className="text-goaliq-border">·</span>
              <span>Premium from {MIN_PREMIUM_USDC} USDC</span>
            </>
          )}
        </div>
        {models.length > 0 && (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-transparent text-sm text-goaliq-muted focus:outline-none"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id} className="bg-goaliq-card">
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!inConversation ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-8">
          <div className="w-full max-w-2xl text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-goaliq-fg sm:text-4xl">
              GOALIQ AI
            </h1>
            <p className="mt-3 text-lg text-goaliq-muted sm:text-xl">
              World Cup intelligence on demand
            </p>
          </div>

          <div className="mt-10 w-full max-w-2xl">{composer}</div>

          <ul className="mt-8 w-full max-w-2xl space-y-3.5">
            {QUICK_PROMPTS.map((chip) => (
              <li key={chip.query}>
                <button
                  type="button"
                  onClick={() => send(chip.query)}
                  className="text-left text-base text-goaliq-muted transition-colors hover:text-goaliq-fg"
                >
                  {chip.label}
                  {"premium" in chip && chip.premium ? (
                    <span className="ml-2 text-sm text-goaliq-gold">· premium</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="mx-auto w-full max-w-2xl flex-1 space-y-10 overflow-y-auto pb-8">
            {messages.map((msg) => (
              <MessageBlock key={msg.id} role={msg.role} content={msg.content} />
            ))}
            {(loading || paying) && (
              <div className="flex gap-4">
                <AssistantAvatar />
                <p className="pt-2 text-base text-goaliq-muted">
                  {paying ? `Confirming ${payingUsdc ?? "…"} USDC in Keplr…` : "Thinking…"}
                </p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-goaliq-borderSubtle pt-6">
            <div className="mx-auto w-full max-w-2xl">{composer}</div>
          </div>
        </>
      )}
    </div>
  );
}

function Composer({
  input,
  loading,
  paying,
  inputRef,
  onInputChange,
  onSend,
  onKeyDown,
}: {
  input: string;
  loading: boolean;
  paying: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const tier = isPremiumQuery(input) ? getTierForQuery(input) : null;

  return (
    <div className="flex items-center gap-3 rounded-full border border-goaliq-border bg-goaliq-card px-5 py-2.5 shadow-card transition-colors focus-within:border-goaliq-accent/40">
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          tier
            ? `${tier.label} · ${tier.usdc} USDC`
            : "Ask about matches, standings, or unlock intelligence…"
        }
        className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-goaliq-fg placeholder:text-goaliq-muted/80 focus:outline-none"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={loading || paying || !input.trim()}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
          input.trim()
            ? "bg-goaliq-accent text-goaliq-bg hover:bg-sky-300"
            : "text-goaliq-muted"
        )}
        aria-label="Send message"
      >
        {paying ? <Coins className="h-4 w-4 animate-pulse" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-goaliq-accent/25 bg-gradient-to-br from-goaliq-accent/20 to-goaliq-accent/5">
      <Bot className="h-5 w-5 text-goaliq-accent" />
    </div>
  );
}

function MessageBlock({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] text-base leading-relaxed text-goaliq-fg sm:text-[17px]">{content}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 pt-0.5 text-base leading-relaxed text-goaliq-fg sm:text-[17px]">
        <ChatMessageBody content={content} />
      </div>
    </div>
  );
}

function stripPaymentNoise(text: string): string {
  return text
    .replace(/Paid\s+0\.01\s+USDC[^\n]*\n?/gi, "")
    .replace(/Tx:\s*https?:\/\/\S+\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
