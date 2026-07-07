import express from "express";
import cors from "cors";
import { INJECTIVE_TESTNET, X402_PREMIUM_PRICE } from "../src/lib/constants";

const app = express();
const PORT = Number(process.env.X402_PORT ?? 3001);

app.use(cors({ origin: true }));
app.use(express.json());

// Premium routes (open in dev — production uses x402 middleware with payTo + facilitator)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", network: "injective-testnet", x402: "demo" });
});

app.get("/premium/h2h", async (req, res) => {
  const team1 = req.query.team1 as string;
  const team2 = req.query.team2 as string;
  res.json({
    premium: true,
    type: "head-to-head",
    teams: [team1, team2],
    summary: "Head-to-head analysis (x402 endpoint)",
    price: "0.01 USDC",
    network: INJECTIVE_TESTNET.network,
  });
});

app.get("/premium/analysis", async (req, res) => {
  const matchId = req.query.matchId as string;
  res.json({
    premium: true,
    type: "tactical-analysis",
    matchId,
    summary: "Tactical breakdown (x402 endpoint)",
    price: "0.01 USDC",
    network: INJECTIVE_TESTNET.network,
  });
});

async function tryX402() {
  try {
    const payTo = process.env.X402_PAY_TO as `0x${string}` | undefined;
    if (!payTo) {
      console.log("ℹ x402: set X402_PAY_TO in .env.local to enable payment middleware");
      return;
    }
    const { injectivePaymentMiddleware } = await import("@injectivelabs/x402/middleware");
    const opts = {
      network: INJECTIVE_TESTNET.network,
      asset: INJECTIVE_TESTNET.usdc,
      amount: X402_PREMIUM_PRICE,
      payTo,
    };
    app.use(
      injectivePaymentMiddleware(
        {
          "GET /premium/h2h": { accepts: [opts], description: "Head-to-head history" },
          "GET /premium/analysis": { accepts: [opts], description: "Tactical analysis" },
        },
        { facilitatorUrl: process.env.X402_FACILITATOR_URL ?? "https://x402.injective.network" }
      )
    );
    console.log("✓ x402 middleware active");
  } catch (err) {
    console.warn("⚠ x402 middleware skipped:", (err as Error).message);
  }
}

const server = app.listen(PORT, () => {
  console.log(`\n⚽ GOALIQ x402 server → http://localhost:${PORT}\n`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`⚠ Port ${PORT} in use — x402 server skipped. Premium unlock still works via /api/premium/unlock`);
    process.exit(0);
  }
  throw err;
});

tryX402();
