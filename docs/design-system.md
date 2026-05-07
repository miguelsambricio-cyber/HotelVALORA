# Design System

**Framework:** Tailwind CSS (custom config)  
**Fonts:** Inter (body), Manrope (`font-headline`) — loaded in `app/layout.tsx`  
**Icons:** Lucide React  
**UI Primitives:** Radix UI (in `components/ui/`)

---

## Color Tokens

### Custom palette (defined in Tailwind config)

| Token | Value | Usage |
|---|---|---|
| `forest-900` | Deep green | Primary brand, headings, CTAs, map pins |
| `forest-800` | — | Hover states on forest-900 |

### Tailwind semantic colors used in reports

| Token | Usage |
|---|---|
| `slate-950` | Footer background |
| `slate-400–600` | Body text, labels, muted text |
| `emerald-50/50` | Highlighted row background (valuation table) |
| `emerald-950` | Logo, nav hover |
| `blue-100` | Report paper border |
| `#005db7` | UPGRADE button (ActionBar), ADR sparkline stroke |
| `#0E4B31` | RevPAR sparkline stroke / area |

---

## Typography

| Class | Usage |
|---|---|
| `font-headline` | Section headings, nav labels (Manrope) |
| `text-2xl font-bold tracking-tighter` | Logo "HotelVALORA" |
| `text-xs font-bold uppercase tracking-wider` | Table labels, section headings |
| `text-[9px] font-bold uppercase tracking-wider` | Sparkline chart labels |
| `text-[10px]` | Report ID, carousel counter, small metadata |
| `text-xl font-extrabold` | Highlighted valuation row value |
| `text-lg font-bold` | Market metrics values |

---

## Spacing Conventions

- Section padding (ReportPaper): `px-8 pt-8 pb-6` → `print:px-4 print:pt-3 print:pb-2`
- Inter-section gap: `space-y-6` on screen, `print:space-y-0` within paper
- Table row height: natural `py-1.5` (asset/valuation) or `py-2.5` (market)
- Card shadows: `shadow-2xl` on ReportPaper, `shadow-sm` on mini cards

---

## Surface Patterns

### Glass overlay
Class: `glass-overlay`  
Usage: `CompetitorPanel`, map overlays — semi-transparent frosted glass.

### Graph paper
Class: `graph-paper`  
Usage: `ReportPaper` background — subtle dot-grid pattern. Removed in print (`background-image: none`).

### MiniChartCard
```tsx
<div className="h-24 w-full border border-slate-200 rounded bg-white shadow-sm relative overflow-hidden">
```
Used for sparkline charts in `SparklineGroup`.

---

## Component Variants

### Buttons
- Primary CTA: `bg-forest-900 text-white text-xs font-bold rounded-lg tracking-widest uppercase hover:brightness-110`
- Upgrade CTA: `bg-[#005db7] text-white`
- Nav arrow (carousel): `w-6 h-6 rounded bg-black/40 hover:bg-black/60 text-white`

### Tables
- All report tables: `w-full text-xs border-collapse`
- Row separator: `border-b border-slate-100` (light) or `border-b border-slate-300` (strong)
- Highlighted row: `bg-emerald-50/50`

### Dot indicator
```tsx
<div className="w-4 h-4 rounded-full border border-slate-400" />
```
Used in `AssetSection` and `MarketSection` tables as a visual bullet.

---

## Tailwind Print Utilities

Always pair `md:` variants with `print:` variants for layout-critical classes:

```
print:hidden          — remove from PDF
print:grid-cols-12    — force 12-col grid
print:col-span-N      — force column width
print:pt-0            — remove top padding
print:gap-4           — tighter gap
print:shadow-none     — remove shadows
print:rounded-none    — remove rounded corners
print:border-none     — remove borders
print:text-xs         — smaller text
print:aspect-auto     — remove aspect ratio constraint
print:h-36            — explicit height cap
```
