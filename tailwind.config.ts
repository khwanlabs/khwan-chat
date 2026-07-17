import type { Config } from "tailwindcss";

// Khwan design tokens (see /Users/somboon/Desktop/Khwan/DESIGN.md).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Signature "field" accent — the ONE accent.
        iris: {
          400: "#7c7bf5", // accent brightened for dark grounds
          500: "#5b5bf0", // primary accent (CTA fill, active)
          bright: "#8686f7", // links / numbers / active text on dark
          violet: "#9a6bf5",
          "soft-light": "#e9e9fd",
          "soft-dark": "#191b39",
        },
        // Cool-biased ink neutrals.
        ink: {
          950: "#07090f",
          900: "#0b0e16",
          850: "#0f1320",
          800: "#151a28",
          700: "#1c2334",
          600: "#29324a",
          500: "#3b465f",
          400: "#6c778f",
          300: "#9aa4ba",
        },
        // Light surfaces & text.
        paper: {
          DEFAULT: "#f5f6fb",
          card: "#ffffff",
        },
        stone: "#ebedf4",
        hairline: "#dce0ec",
        "text-strong": "#10131d",
        "text-body": "#39415a",
        "text-muted": "#6c778f",
        // Semantic — state only, never brand.
        coherence: "#1fb894",
        caution: "#d99a3e",
        violation: "#e14b4b",
        // On-ground text tokens (dark app).
        "on-dark": "#eef1f7",
        "on-accent": "#ffffff",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "var(--font-thai)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        thai: ["var(--font-thai)", "var(--font-geist-sans)", "sans-serif"],
      },
      borderRadius: {
        // Crisp / instrument radii.
        xs: "3px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
