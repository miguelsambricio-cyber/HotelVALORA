# Design System · UI Principles

The product feel target is **Bloomberg Terminal × CoStar × MSCI Real Assets × luxury hospitality**. These principles distil that brief into ship-rules.

## 1 · Institutional density first

- Every page must fit a **1440 × 900 laptop at 100% zoom** without page-level scroll.
- The kiosk surfaces (`/library/*`) use `h-screen` and rely on **internal scroll** in the content card only.
- Sidebar widths capped at `264–288 px` (not 320+) — saves ~32 px of body width.
- Body row capped at `max-w-[1600px]` and centred — gives ultra-wide monitors a comfortable read width.

## 2 · Compact spacing

- Default cell padding: `px-3 py-2.5` (institutional table density)
- Card padding: `p-5` for sidebars, `p-3` for floating preview cards
- Gap between sidebar blocks: `gap-4` (not `gap-6`)
- Header bar of every list page: `gap-1.5` between title / subtitle / badge

## 3 · Typography scale

| Token | Size | Weight | Use |
|---|---|---|---|
| Headline-3xl | `text-3xl` (30 px) | extrabold tracking-tighter | Page H1 in list views |
| Headline-2xl | `text-2xl` (24 px) | extrabold tracking-tight | Sidebar title |
| Body | `text-[13px]` | medium | Sidebar subtitle, table cells, search input |
| Label | `text-[10px]` | bold uppercase tracking-widest | All "section labels" |
| Mono | `font-mono` `text-[11px]` | regular | Reference codes, ZIPs, rooms |

Manrope (`font-headline`) → headlines and labels.
Inter (`font-body`) → everything else.

## 4 · Colour discipline

- **forest-900** (#062C1C) → primary text, hotel names, totals, badges
- **forest-700** (#0E4B31) → secondary active accents
- **blue-700** (#1d4ed8 Tailwind default) → community + premium-gated values (CAPEX, IRR Equity)
- **emerald-700/800/900** → Cap Rate, Market Value TTM, Yield, IRR Project
- **lime-300** → TOP PROMOTE chips + on-dark accents
- **amber-400** → stars (filled) — anything earned/promoted
- **slate-300** → inactive icons (gym not available, contact disabled, etc.)
- **slate-100 / slate-50** → row dividers, hover row, label backgrounds

Full token list: `docs/design-system/colors-typography.md` and `docs/design-system.md`.

## 5 · Shadow language

- Sidebar: `shadow-xl` (heavier — anchors the rail)
- Floating cards: `shadow-[0_20px_40px_rgba(6,44,28,0.18)]` (forest-tinted)
- Map controls: `shadow-md` (medium presence)
- Table card: `shadow-[0_20px_40px_rgba(0,51,30,0.06)]` (institutional)
- Buttons: `shadow-sm` only when surface differs from container

## 6 · Responsive collapse rules

| Width | Behaviour |
|---|---|
| ≥ 1440 px | Default kiosk layout — sidebar 288 px + content max-w-[1600px] |
| 1024 – 1439 px | Sidebar drops to 264 px; content fills remaining |
| 768 – 1023 px | Sidebar collapses to drawer (planned, not shipped); content full-width |
| < 768 px | Map ↔ list bottom sheet (planned, not shipped) |

## 7 · Print discipline

Every chrome element carries `print:hidden`. The report engine (see `docs/architecture/report-engine.md`) is the only print-aware surface today.

## 8 · The "institutional feel" checklist

Before merging a new surface, verify:

- [ ] No oversized padding (target ≤ `p-5` on any block)
- [ ] No oversized typography (rare exception: hero on landing)
- [ ] Body text uses `text-[13px]`, not `text-sm`
- [ ] Labels uppercase + `tracking-widest`
- [ ] Slate-300 for inactive states, never opacity-50
- [ ] At least one Manrope element per surface (titles)
- [ ] Hover row uses `bg-slate-50`, never a custom background
- [ ] No emojis in chrome (data badges only)

## Cross-references

| Topic | Doc |
|---|---|
| Colour + typography tokens | `docs/design-system/colors-typography.md` |
| Canonical components | `docs/design-system/components.md` |
| Print + PDF | `docs/print-pdf.md` |
