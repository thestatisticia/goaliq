import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        goaliq: {
          bg: "#060a12",
          card: "#0c1220",
          surface: "#111827",
          border: "#1e293b",
          muted: "#64748b",
          accent: "#38bdf8",
          accentDim: "#0ea5e9",
          gold: "#fbbf24",
          live: "#f87171",
          success: "#34d399",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 24px -4px rgba(0,0,0,0.4)",
        glow: "0 0 40px -8px rgba(56,189,248,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
