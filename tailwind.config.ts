import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617", // neutral-950
        panel: "rgba(2,6,23,0.6)",
        neon: {
          violet: "#a855f7",
          cyan: "#22d3ee",
          pink: "#ec4899",
        },
      },
      boxShadow: {
        neon:
          "0 0 0 1px rgba(168,85,247,0.35), 0 0 24px rgba(168,85,247,0.15)",
        cyan:
          "0 0 0 1px rgba(34,211,238,0.35), 0 0 24px rgba(34,211,238,0.15)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      backgroundImage: {
        "grid-cyber":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-cyber": "32px 32px",
      },
    },
  },
  plugins: [],
};

export default config;
