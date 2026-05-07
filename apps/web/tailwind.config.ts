import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS variable tokens — required for @apply border-border etc.
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Landing palette — deep emerald design system
        forest: {
          50:  "#f0f9f4",
          700: "#0E4B31",
          900: "#062C1C",
        },
        // Dashboard brand palette
        brand: {
          50:  "#f0f4ff",
          100: "#e0ebff",
          200: "#c7d9fe",
          300: "#a5bcfc",
          400: "#8198f8",
          500: "#6272f1",
          600: "#4d52e4",
          700: "#3f41c9",
          800: "#3538a2",
          900: "#303581",
          950: "#1e1f4b",
        },
        gold: {
          400: "#d4af37",
          500: "#b8952a",
        },
      },
      fontFamily: {
        sans:     ["var(--font-inter)", "system-ui", "sans-serif"],
        display:  ["var(--font-manrope)", "system-ui", "sans-serif"],
        // Alias used by Stitch designs ("font-headline" = Manrope)
        headline: ["var(--font-manrope)", "system-ui", "sans-serif"],
        body:     ["var(--font-inter)", "system-ui", "sans-serif"],
        label:    ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
