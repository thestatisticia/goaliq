import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        goaliq: {
          bg: "var(--gq-bg)",
          fg: "var(--gq-fg)",
          card: "var(--gq-card)",
          surface: "var(--gq-surface)",
          border: "var(--gq-border)",
          muted: "var(--gq-muted)",
          accent: "var(--gq-accent)",
          accentDim: "var(--gq-accent-dim)",
          gold: "var(--gq-gold)",
          live: "var(--gq-live)",
          success: "var(--gq-success)",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        hero: ["var(--font-hero)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
