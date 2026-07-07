# GOALIQ

**World Cup 2026 live scores + AI intelligence. Free to browse. Pay 0.01 USDC on Injective when you want deeper match insights.**

Built for the **Injective Global Cup** hackathon.

---

## What is GOALIQ?

GOALIQ is a football intelligence platform with two parts:

1. **Dashboard** — live scores, today's matches, results, knockout bracket, and all 48 World Cup teams.
2. **GOALIQ AI** — an AI copilot that answers questions like *"What matches are today?"* or *"Did Egypt lose?"*

Most of the app is **free**. Users only pay when they want **premium analysis** — win chances, team form, and head-to-head stats.

---

## How the app works (user flow)

```
1. Open the app → see live World Cup scores on the Dashboard
2. Go to AI Copilot → ask football questions in plain English
3. For deep stats → connect Keplr wallet → pay 0.01 USDC → get the report
```

### Pages

| Page | What it does |
|------|----------------|
| `/dashboard` | Live, Today, Results, History, Knockout, Teams |
| `/copilot` | AI chat — scores, schedules, win chances |
| `/match/[id]` | Single match score, events, stats |
| `/fund` | How to get free testnet INJ + USDC |

### What's free vs paid

| Free | Paid (0.01 USDC) |
|------|------------------|
| Live scores | Win probability % |
| Today's schedule | Team form & ratings |
| Results & history | Head-to-head analysis |
| General AI chat | Premium prediction reports |

---

## How GOALIQ uses Injective

GOALIQ is not just a football app with crypto bolted on. **Injective powers the payment layer.**

### 1. Keplr wallet
Users connect **Keplr** to the app. The wallet shows their **INJ** (gas) and **USDC** balance on Injective testnet.

### 2. USDC micropayments
When a user asks for premium analysis (e.g. *"win chances for Switzerland"*):
1. Keplr prompts them to send **0.01 USDC** on Injective testnet
2. The app verifies the payment **on-chain**
3. Only then unlocks the detailed stats report

No subscription. No account. Pay per question.

### 3. x402 (pay-per-request)
GOALIQ follows the **x402** pattern — each premium API call costs a small USDC fee. A separate Express server (`port 3001`) runs Injective's x402 middleware for premium endpoints.

### 4. CCTP (cross-chain USDC)
The **Fund Wallet** page guides users to get testnet USDC via:
- [Circle faucet](https://faucet.circle.com) (Injective Testnet)
- [Injective faucet](https://testnet.faucet.injective.network) (free INJ for gas)
- Optional CCTP bridge from Sepolia

---

## Simple flow diagram

```
User                    GOALIQ App                Injective Testnet
  |                          |                          |
  |-- Open dashboard ------->|                          |
  |<-- Live scores ----------|                          |
  |                          |                          |
  |-- Ask "win chances" ---->|                          |
  |<-- "Pay 0.01 USDC" ------|                          |
  |                          |                          |
  |-- Confirm in Keplr --------------------------------->|
  |                          |<-- Verify USDC tx -------|
  |<-- Premium report -------|                          |
```

---

## Demo for judges (2 minutes)

1. **Dashboard** → http://localhost:3000/dashboard  
   Show Live / Today / Results tabs with real World Cup data.

2. **AI Copilot** → http://localhost:3000/copilot  
   Ask: *"What World Cup matches are today?"* or *"So did Egypt lose?"*

3. **Premium payment**  
   - Connect Keplr (top right)  
   - Ask: *"Win chances for Switzerland"*  
   - Approve **0.01 USDC** in Keplr  
   - Show the structured prediction report

4. **Fund Wallet** → http://localhost:3000/fund  
   Show how new users get testnet tokens (no real money).

---

## Run locally

```bash
npm install
cp .env.example .env.local
# Add FOOTBALL_DATA_KEY and GROQ_API_KEY to .env.local
npm run dev:clean
```

Open **http://localhost:3000**

You need:
- **Node.js 18+**
- **Keplr** wallet (Injective testnet)
- Free key from [football-data.org](https://www.football-data.org/client/register)

---

## Tech (short)

- **Frontend:** Next.js 14, React, Tailwind
- **Football data:** football-data.org + API-Football
- **AI:** Groq (free LLM for chat)
- **Blockchain:** Injective testnet, Keplr, USDC, x402, viem

---

## Injective hackathon tracks covered

| Track | How we use it |
|-------|----------------|
| **x402** | Pay 0.01 USDC per premium insight |
| **USDC** | On-chain payments via Keplr |
| **CCTP** | Fund Wallet guides for cross-chain USDC |
| **AI** | GOALIQ AI with real data + Injective payments |

---

<p align="center">
  <strong>GOALIQ</strong> — Free World Cup data. Premium intelligence on Injective.
</p>
