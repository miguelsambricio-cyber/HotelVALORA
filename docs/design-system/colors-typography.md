# Design System · Colors + Typography

Canonical token reference. Tailwind config lives in `apps/web/tailwind.config.ts`. The shadcn CSS variables live in `apps/web/src/app/globals.css`.

## Color palette

### Forest (brand primary)

| Token | Hex | Use |
|---|---|---|
| `forest-50` | #f0f9f4 | Light forest surface (rare) |
| `forest-700` | #0E4B31 | Secondary active accents, active amenity icons |
| `forest-900` | #062C1C | Primary text, hotel names, totals, badges |

### Brand (legacy dashboard)

| Token | Hex | Use |
|---|---|---|
| `brand-{50,100,…,950}` | full purple-blue ramp | Dashboard chrome only (legacy) |

### Gold (luxury accents)

| Token | Hex | Use |
|---|---|---|
| `gold-400` | #d4af37 | Reserved for premium accents (not in heavy use yet) |
| `gold-500` | #b8952a | Reserved |

### Tailwind standard palettes (used heavily)

| Palette | Where |
|---|---|
| `blue-700` | Community markers, CAPEX, IRR Equity (premium-gated) |
| `blue-50/30`, `blue-50/40` | Faint backgrounds on blue accent cols |
| `emerald-50` → `emerald-950` | Cap Rate, Market Value TTM, Yield, IRR Project (forest-tinted Tailwind ramp) |
| `lime-300` | TOP PROMOTE chip background, on-dark accents |
| `amber-400` / `amber-500` / `yellow-400` | Stars filled |
| `slate-300` | Inactive icons / disabled states |
| `slate-{50,100,200,500,600,700,900,950}` | Body text + chrome + dividers + footer |

### Semantic tokens (shadcn CSS variables)

Available via Tailwind `bg-background`, `text-foreground`, `bg-primary`, etc. Defined in `globals.css`. Use sparingly — prefer the forest/blue/emerald system above for institutional surfaces.

## Typography

### Families

| Variable | Family | Purpose |
|---|---|---|
| `--font-inter` | Inter | Body, labels |
| `--font-manrope` | Manrope | Headlines (`font-headline`), titles |

### Aliases (Tailwind classes)

- `font-sans` → Inter (default)
- `font-display`, `font-headline`, `font-body`, `font-label` — Manrope or Inter depending on alias

### Size scale (institutional density)

| Class | Size | Use |
|---|---|---|
| `text-5xl` | 48 px | Landing hero only |
| `text-3xl` | 30 px | List view H1 |
| `text-2xl` | 24 px | Sidebar title |
| `text-xl` | 20 px | Floating card title |
| `text-base` | 16 px | Compact card title |
| `text-sm` | 14 px | Buttons, links |
| `text-[13px]` | 13 px | **Body, table cell, search input — default institutional body size** |
| `text-xs` | 12 px | Sparse metadata |
| `text-[11px]` | 11 px | Mono codes, ZIPs |
| `text-[10px]` | 10 px | **Labels (uppercase tracking-widest)** |
| `text-[9px]` | 9 px | Sub-headers, smallest chip text |
| `text-[8px]` | 8 px | Amenities row label (mockup-only — rare) |

### Tracking

| Class | Use |
|---|---|
| `tracking-widest` | All labels (uppercase) |
| `tracking-tighter` | Hero H1, AppHeader logo, chip text |
| `tracking-tight` | Sidebar H1 |
| `tracking-normal` | Default body |

## Border radius

The tailwind config has been customised:

| Token | Value |
|---|---|
| `DEFAULT` | 0.125 rem |
| `rounded-lg` | 0.25 rem |
| `rounded-xl` | 0.5 rem |
| `rounded-full` | 0.75 rem |

This makes the default `rounded` extra-tight (institutional feel). Most rounded card surfaces use `rounded-xl` or `rounded-2xl`.

## Spacing

Default Tailwind 4 px ramp. Common values across the app:

- `p-1.5` (6px) — chip padding
- `p-2` to `p-3` (8–12px) — table cells
- `p-4` to `p-5` (16–20px) — cards
- `p-8` (32px) — only on dashboard hero cards
- `gap-1.5` to `gap-4` — primary
- `gap-6`, `gap-8` — only on landing

## Selection styling

Body has `selection:bg-tertiary-fixed selection:text-primary` — Stitch-derived. Keep institutional.

## Cross-references

| Topic | Doc |
|---|---|
| Full Tailwind config | `apps/web/tailwind.config.ts` |
| CSS variable tokens | `apps/web/src/app/globals.css` |
| UI principles + density rules | `docs/design-system/ui-principles.md` |
