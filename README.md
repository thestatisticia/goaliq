# GOALIQ

**Football Intelligence. Powered by AI. Paid Per Insight.**

> GOALIQ is an AI-native football intelligence platform that replaces sports subscriptions with instant, pay-per-insight analysis powered by Injective x402 micropayments.

Built for the **Injective Global Cup** hackathon.

---

## Elevator pitch

Football fans shouldn't have to pay monthly subscriptions just to access advanced match insights.

GOALIQ combines live World Cup data with an AI copilot and introduces a **pay-per-insight** model powered by Injective x402. Instead of subscribing, fans pay only a few cents in USDC when they want premium intelligence — win probabilities, tactical breakdowns, or tournament forecasts.

---

## The problem

Football fans constantly switch between multiple platforms:

- one for scores
- another for statistics
- another for predictions
- another for AI

Premium insights are usually hidden behind expensive monthly subscriptions — even if you only need one answer.

## Our solution

GOALIQ brings everything together:

- **Live World Cup data** — free for everyone
- **AI football assistant** — grounded in real fixture data
- **Premium match intelligence** — unlock on demand
- **Pay only when you need depth** — no accounts, no subscriptions

---

## What is GOALIQ?

GOALIQ is an **AI-native football intelligence platform** that helps fans understand the World Cup — not just watch it.

It combines real-time match data with conversational AI and on-demand premium analysis powered by **Injective x402 micropayments**. Live coverage stays free; advanced intelligence unlocks instantly when fans need it.

### Pages

| Page | What it does |
|------|----------------|
| `/dashboard` | Live matches, bracket, teams, **Injective receipt panel** |
| `/copilot` | AI football assistant — free chat + premium intelligence via x402 |
| `/match/[id]` | Match context, events, **match summary** (free), **unlock intelligence** (paid) |
| `/fund` | Get testnet INJ + USDC for micropayments |

### Intelligence tiers

| Tier | Price | What unlocks |
|------|-------|----------------|
| **Match Snapshot** | 0.02 USDC | Win chances, team form, match preview |
| **Tactical Intelligence** | 0.05 USDC | Full match breakdown on `/match/[id]` |
| **AI World Cup Forecast** | 0.10 USDC | Tournament-winner and knockout outlook |

**Free vs paid (copilot):**

| Free | Paid |
|------|------|
| Live scores, schedule, standings, bracket | Team form |
| Basic H2H meetings / scheduled fixture | Win chances & match intelligence |
| General chat | Tournament forecast |

---

## Why Injective is central (not bolted on)

Traditional sports platforms: **monthly subscription → use once → cancel.**

GOALIQ: **ask one question → pay $0.02 USDC → receive premium intelligence instantly.**

Injective x402 enables a new business model — every AI insight becomes an on-demand digital service unlocked through seamless micropayments. Injective isn't just infrastructure; it's the reason pay-per-insight works.

### How it works (simple)

1. User requests premium intelligence (copilot or match page)
2. GOALIQ quotes a small USDC fee via **x402**
3. User pays in **Keplr** on Injective testnet
4. Payment is **verified on-chain**
5. Intelligence unlocks instantly — one question, one payment, one answer

### x402 endpoints (production)

| Endpoint | Purpose | Price |
|----------|---------|-------|
| `/api/x402/premium/analysis?matchId=` | Tactical Intelligence | 0.05 USDC |
| `/api/x402/premium/h2h?team1=&team2=` | Match Snapshot (H2H) | 0.02 USDC |
| `/api/x402/copilot` | Premium copilot reply | 0.02–0.10 USDC |

**Where users see it:** match-page unlock cards, copilot premium queries, dashboard receipt panel.

---

## Demo for judges (2 minutes)

1. **Dashboard** — live World Cup data (free layer)
2. **Copilot** — *"What matches are today?"* (free) then *"Win chances for Switzerland"* (paid)
3. **x402 flow** — Keplr USDC → instant intelligence → on-chain receipt
4. **Fund Wallet** — testnet tokens (no real money)

Pitch the **business model**, not just the scores UI.

---

## Run locally

```bash
npm install
cp .env.example .env.local
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `FOOTBALL_DATA_KEY` | Yes | Live scores, standings, bracket |
| `GROQ_API_KEY` | Recommended | AI copilot |
| `NEXT_PUBLIC_PAYMENT_WALLET` | For x402 | `0x…` treasury (receives USDC) |
| `NEXT_PUBLIC_APP_URL` | Production | e.g. `https://your-app.vercel.app` |

```bash
npm run dev:clean
```

Open **http://localhost:3000** · Keplr on Injective testnet · USDC via `/fund`

---

## Tech

Next.js 14 · football-data.org · Groq AI · Injective testnet · Keplr · USDC · **x402** · viem

---

## Vision

GOALIQ reimagines how fans access premium sports intelligence.

Instead of expensive subscriptions, every AI insight becomes an on-demand digital service unlocked instantly through Injective's x402 payment protocol. Live football data remains free for everyone, while advanced analysis is available exactly when fans need it.

GOALIQ demonstrates how AI and blockchain together can create a new generation of consumer applications powered by seamless micropayments.

---

<p align="center">
  <strong>GOALIQ</strong> — Football Intelligence. Powered by AI. Paid Per Insight.
</p>
