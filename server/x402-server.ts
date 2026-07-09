/**
 * Legacy standalone x402 server for local dev with @injectivelabs/x402 middleware.
 * Production uses Next.js routes at /api/x402/* (same x402 402 → pay → retry flow).
 *
 * Run: npm run dev:x402
 */
import express from "express";
import cors from "cors";
import { INJECTIVE_TESTNET, X402_PREMIUM_PRICE } from "../src/lib/constants";

const app = express();
const PORT = Number(process.env.X402_PORT ?? 3001);
const NEXT_APP = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    network: "injective-testnet",
    x402: true,
    note: "Prefer /api/x402 on the Next.js app in production",
  });
});

/** Proxy to Next.js x402 handlers when the app is running */
app.get("/premium/analysis", async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const upstream = await fetch(`${NEXT_APP}/api/x402/premium/analysis?${qs}`, {
      headers: req.headers as HeadersInit,
    });
    const body = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (["payment-required", "payment-response", "x-payment-response", "content-type"].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });
    res.send(body);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

app.get("/premium/h2h", async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const upstream = await fetch(`${NEXT_APP}/api/x402/premium/h2h?${qs}`, {
      headers: req.headers as HeadersInit,
    });
    const body = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (["payment-required", "payment-response", "x-payment-response", "content-type"].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });
    res.send(body);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

async function tryX402() {
  try {
    const payTo = process.env.X402_PAY_TO as `0x${string}` | undefined;
    if (!payTo) {
      console.log("ℹ x402: set X402_PAY_TO for EIP-3009 middleware on this port");
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
    console.log("✓ x402 EIP-3009 middleware active (proxied routes also available)");
  } catch (err) {
    console.warn("⚠ x402 middleware skipped:", (err as Error).message);
  }
}

const server = app.listen(PORT, () => {
  console.log(`\n⚽ GOALIQ x402 server → http://localhost:${PORT}`);
  console.log(`   Proxies premium routes to ${NEXT_APP}/api/x402/*\n`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`⚠ Port ${PORT} in use — x402 server skipped. Use /api/x402 on Next.js.`);
    process.exit(0);
  }
  throw err;
});

tryX402();
