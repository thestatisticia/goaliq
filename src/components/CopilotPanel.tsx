"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Coins } from "lucide-react";
import type { ChatMessage, CopilotContext } from "@/lib/types";
import { useWallet } from "@/context/WalletContext";
import { usePaymentConfig } from "@/context/PaymentConfigContext";
import { cn } from "@/lib/utils";
import { PaymentInfo } from "@/components/PaymentInfo";
import { isPremiumQuery, getTierForQuery } from "@/lib/payments";
import { sendPremiumPayment } from "@/lib/usdc-payment";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { COPILOT_PROMPT_CHIPS } from "@/lib/copilot-prompts";

interface CopilotPanelProps {
  context?: CopilotContext;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

export function CopilotPanel({ context = {} }: CopilotPanelProps) {
  const wallet = useWallet();
  const { paymentsEnabled, paymentWallet } = usePaymentConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey ninja! I'm **GOALIQ AI** — your World Cup intelligence copilot.\n\n• **Free:** scores, today's matches, friendly chat\n• **0.01 USDC:** win chances, form, head-to-head previews",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [llmReady, setLlmReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading || paying) return;

    const text = input.trim();
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
        txHash = await sendPremiumPayment(wallet.evmAddress as `0x${string}`, paymentWallet, tier.usdc);

        const verify = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash, from: wallet.evmAddress, amount: tier.usdc }),
        });
        const v = await verify.json();
        if (!v.verified) {
          throw new Error(v.error ?? "Payment verification failed");
        }
        await wallet.refreshBalance();
        setPaying(false);
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
    }
  }

  const suggestions = COPILOT_PROMPT_CHIPS;

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[560px] flex-col rounded-xl border border-goaliq-border bg-goaliq-card">
      <div className="flex items-center gap-2 border-b border-goaliq-border px-4 py-3">
        <Bot className="h-5 w-5 text-goaliq-accent" />
        <h2 className="font-semibold">GOALIQ AI</h2>
        <span
          className={cn(
            "ml-2 rounded-full px-2 py-0.5 text-[10px]",
            llmReady ? "bg-goaliq-accent/20 text-goaliq-accent" : "bg-yellow-500/20 text-yellow-400"
          )}
        >
          {llmReady ? "AI" : "Basic"}
        </span>
      </div>

      <div className="px-4 py-2 border-b border-goaliq-border/50 space-y-2">
        <PaymentInfo />
        {models.length > 0 && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-goaliq-gold" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 bg-transparent text-xs text-gray-400 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-goaliq-card">
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                msg.role === "assistant" ? "bg-goaliq-accent/20 text-goaliq-accent" : "bg-gray-700"
              )}
            >
              {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                "rounded-lg px-3 py-2 max-w-[90%]",
                msg.role === "assistant" ? "bg-gray-800/80" : "bg-goaliq-accent/20 text-goaliq-accent"
              )}
            >
              {msg.role === "assistant" ? (
                <ChatMessageBody content={msg.content} />
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {(loading || paying) && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-goaliq-accent/20 flex items-center justify-center">
              {paying ? <Coins className="h-4 w-4 text-goaliq-gold animate-pulse" /> : <Bot className="h-4 w-4 text-goaliq-accent animate-pulse" />}
            </div>
            <div className="rounded-lg bg-gray-800/80 px-3 py-2 text-sm text-gray-400">
              {paying ? `Confirm ${getTierForQuery(input).usdc} USDC payment in Keplr...` : "Thinking..."}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {suggestions.map((chip) => (
            <button
              key={chip.query}
              onClick={() => setInput(chip.query)}
              className="rounded-full border border-goaliq-border px-3 py-1 text-xs text-gray-400 hover:border-goaliq-accent hover:text-goaliq-accent transition-colors"
            >
              {chip.label}
              {chip.premium ? ` · ${getTierForQuery(chip.query).usdc} USDC` : ""}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-goaliq-border p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={
            isPremiumQuery(input)
              ? `${getTierForQuery(input).label} — ${getTierForQuery(input).usdc} USDC`
              : "Ask about matches..."
          }
          className="flex-1 rounded-lg bg-gray-800/50 border border-goaliq-border px-3 py-2 text-sm focus:outline-none focus:border-goaliq-accent"
        />
        <button
          onClick={send}
          disabled={loading || paying || !input.trim()}
          className="rounded-lg bg-goaliq-accent px-3 py-2 text-sm font-medium text-black disabled:opacity-50 hover:bg-goaliq-accent/90 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
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
