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
        // ─────────────────────────────────────────────────────────────
        // Phase 1 · Token harmonization · 2026-05-19
        // See docs/report/phase-1-token-harmonization.md
        //
        // editable-* is the INTERACTION / SYSTEM-STATE layer, NOT the
        // HotelVALORA brand color. The institutional memorandum surface
        // must remain neutral / institutional / analytical — never read
        // as a "blue product UI". editable-600 (#005db7) flags exactly
        // one role: "operator can interact here / value is editable".
        // Brand-level color responsibility stays with forest-* and
        // gold-*. Do not promote editable-* to a hero/background role.
        // ─────────────────────────────────────────────────────────────
        editable: {
          50:  "#eff5fb",
          100: "#dbe7f4",
          200: "#b9d0e8",
          300: "#8db1d8",
          400: "#5588c0",
          500: "#246ab5",
          600: "#005db7",   // ★ canonical operator-edit signal
          700: "#004c95",
          800: "#003b73",
          900: "#002a52",
          950: "#001735",
        },
        // Risk semantics · role aliases over Tailwind ramps.
        // Hue / weight are deliberately strong so warning / covenant /
        // reconciliation badges keep visual protagonism — DO NOT mute.
        risk: {
          ok:     "#047857",  // emerald-700
          okBg:   "#ecfdf5",  // emerald-50
          warn:   "#b45309",  // amber-700
          warnBg: "#fffbeb",  // amber-50
          fail:   "#be123c",  // rose-700
          failBg: "#fff1f2",  // rose-50
          info:   "#334155",  // slate-700
          infoBg: "#f8fafc",  // slate-50
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
      // Phase 1 · Badge size scale. 12px (text-xs) and up stay on the
      // Tailwind defaults; this scale only formalises the sub-12px
      // labels that already drift across the codebase.
      fontSize: {
        "badge-xs": ["9px",  { lineHeight: "12px" }],
        "badge-sm": ["10px", { lineHeight: "13px" }],
        "badge-md": ["11px", { lineHeight: "14px" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Phase 1 · Sticky offsets · max-widths · density · print rhythm.
      // The sticky values are CSS variables so a single header-height
      // change rolls through every sticky consumer.
      spacing: {
        "sticky-app":      "var(--sticky-app)",
        "sticky-tight":    "var(--sticky-tight)",
        "sticky-rail":     "var(--sticky-rail)",
        "sticky-report":   "var(--sticky-report)",
        "memo-gap":        "2rem",
        "row-compact":     "0.25rem",
        "row-default":     "0.625rem",
        "row-comfortable": "0.875rem",
        "print-section-x": "1rem",
        "print-section-t": "0.75rem",
        "print-section-b": "0.5rem",
      },
      // Phase 1 · Shell max-widths. 1600 is the institutional memorandum
      // canvas (year grids · financing schedules · side KPI strips ·
      // PDF parity). Do NOT raise — stretching past 1600 turns the memo
      // into a spreadsheet.
      maxWidth: {
        "shell-report": "var(--shell-report)",
        "shell-admin":  "var(--shell-admin)",
        "shell-prose":  "var(--shell-prose)",
      },
      // Phase 1 · Memo shadow language · consolidates 13 inline RGBA
      // shadow literals to 5 named tokens.
      boxShadow: {
        "memo-card":     "0 20px 40px rgba(0,51,30,0.06)",
        "memo-search":   "0 20px 40px rgba(6,44,28,0.08)",
        "memo-floating": "0 20px 40px rgba(6,44,28,0.18)",
        "memo-pill":     "0 8px 24px rgba(0,51,30,0.08)",
        "memo-col-edge": "2px 0 4px -2px rgba(0,0,0,0.04)",
      },
      // Phase 1 · Z-index 7-step semantic scale. Replaces 12 drift
      // values incl. outliers z-[60] / z-[200] / z-[210] / z-[1000].
      zIndex: {
        base:     "0",
        raised:   "10",   // sticky-first-col in tables
        sticky:   "20",   // dropdowns, minor floating overlays
        overlay:  "30",   // floating KPI strip, scenario picker, bulk-action toolbar
        dropdown: "40",   // dropdown menus, edit-mode-bar, table head over col
        header:   "50",   // AppHeader, dialogs, modals
        drawer:   "60",   // article-drawer, agent-detail-panel
        toast:    "70",   // sonner toaster
        popover:  "80",   // contact-cell popup, tooltips
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
