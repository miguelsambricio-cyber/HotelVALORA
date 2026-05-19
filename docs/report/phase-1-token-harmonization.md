# Phase 1 · Token Harmonization Plan

**Status:** Phase 1A in progress · Phase 1B **DEFERRED** pending temporary public deploy of `/report/financials/underwriting`
**Author:** Phase 1 of the synchronization initiative · 2026-05-19
**Inputs:** `docs/report/synchronization-audit-v1.md` (audit) · this doc (plan)
**Scope:** foundation tokens only — color, spacing, typography, sticky, z-index, max-widths, badges, density, print, dark-mode decision documentation
**Out of scope:** any new component · any new layout · any page migration · any visual redesign · dark-mode implementation
**Success criterion:** every report surface compiles against one canonical token set, with zero pixel diff except the intentional micro-changes catalogued in §5.2

---

> ## ⛔ STRATEGIC GATE · DEPLOY-FIRST ORDERING · 2026-05-19
>
> Phase 1 has been split into two halves to protect an imminent public deploy:
>
> ### Phase 1A · Safe additive foundation · **EXECUTED**
>
> Pure config additions in `apps/web/tailwind.config.ts` and `apps/web/src/app/globals.css`. **Zero consumer code touched. Zero visual diff guaranteed by Tailwind 3 JIT semantics** (new tokens emit no CSS until used). This is the "internal mapping layer" the operator authorised.
>
> **Done:** new `editable-*` palette · `risk-*` role aliases · sticky offset CSS variables · `shell-*` max-widths · `memo-*` shadows · `badge-*` font sizes · 7-step semantic z-index scale · dormant-`.dark` inline comment.
>
> ### Phase 1B · Codemods · **DEFERRED** until after temporary deploy stabilises
>
> Class replacements that COULD introduce visual drift, even if mechanical, are paused. This includes:
> - `#005db7` literal → `editable-600` (51 occurrences)
> - `top-{0,20,24,28}` → `sticky-*` (18 files)
> - inline RGBA shadows → `shadow-memo-*` (14 files)
> - `max-w-screen-2xl` / `[1600px]` → `max-w-shell-report` (5 files)
> - z-index outlier consolidation (~10 files)
>
> **Reason:** stability > elegance until the underwriting flagship demo is live on hotelvalora.com. Any class rename, even a value-preserving one, carries a non-zero risk of regression that would be unacceptable so close to a public showcase.
>
> ### Resume conditions
>
> Phase 1B (and Phase 2+ of the synchronization roadmap) resume **only after**:
>
> 1. Temporary public deploy of `/report/financials/underwriting` to hotelvalora.com is live.
> 2. Institutional QA pass (screenshot validation · PDF validation · investor/operator demo readiness).
> 3. Operator green-lights resumption.
>
> Until then, the only permitted work on the design-system layer is:
> - additive token registry (done)
> - semantic token definitions (done)
> - documentation (this doc, the audit, design-system docs)
> - dormant infrastructure cleanup (the `.dark` comment is the only example so far)
> - naming normalization without visual impact (no current candidate)
> - internal mapping layers (Tailwind `theme.extend` keys count as one)
>
> Any work that touches a consumer file's classes is **paused**.

---

---

## 0 · TL;DR

1. **The audit found 51 hardcoded `#005db7` occurrences across 18 files**, 18 sticky-offset files drifting across 4 offset values, 80+ z-index usages clustered around `z-30`/`z-50` without a stratification rule, 4 distinct shell max-widths in active use, and zero inline `style={{ color: "#…" }}` literals (good news).
2. **Critical namespace collision:** the existing Tailwind `brand-*` palette is purple-blue (`#4d52e4` family, marked "legacy dashboard"), so the synchronization audit's earlier proposal of `brand-blue-600 = #005db7` would conflict. **The Phase 1 plan introduces a new semantic role token `editable-*` instead**, leaving `brand-*` untouched.
3. **`darkMode: "class"` is dead code.** Zero `dark:` variants in components, zero `ThemeProvider`, zero `.dark` wrapper applications. Removing the toggle breaks nothing. We document the dependency but do **not** decide in Phase 1.
4. **AppHeader real height is ~48px** (`py-2.5` + content + 1px border), so the current sticky offsets (`top-20` = 80px, `top-24` = 96px, `top-28` = 112px) are intentional breathing room, not strict header alignment. The token system codifies the intent (`--sticky-tight` / `--sticky-rail` / `--sticky-report`) without flattening it.
5. **Phase 1 is reversible.** All changes are additive (new tokens) plus mechanical find-and-replace (literal → token class). No structural code change. Each surface should render pixel-identical before/after.
6. **Approval gates: 4.** Gate 0 (this plan) · Gate 1 (token registry PR · ~80 LOC of Tailwind config + globals.css edits) · Gate 2 (codemod PRs · one per token family, ~10–20 files each) · Gate 3 (visual diff approval per surface) · Gate 4 (merge to main).
7. **Estimated effort: 1–2 working days** for tokens + codemods. **No new components.**

---

## 1 · Scope and Non-Goals

### 1.1 In scope (Phase 1)

| # | Concern | Outcome |
|---|---|---|
| 1 | Semantic naming of `#005db7` | New `editable-*` Tailwind palette + role token |
| 2 | Sticky top-offset drift | One CSS variable + 3–4 named sticky tokens |
| 3 | Z-index drift | 7-step semantic z-index scale |
| 4 | Max-width drift | Three explicit shell-class tokens (no forced collapse) |
| 5 | Badge size drift | Three badge size tokens (`xs/sm/md`) |
| 6 | Table density drift | Three named density tokens |
| 7 | Print canvas constants | Promote existing globals.css constants to documented CSS vars |
| 8 | Memo spacing rhythm | Codified section padding + inter-section gap tokens |
| 9 | Typography scale | Documented (already mostly codified) — small consistency pass |
| 10 | Border-radius | Documented (small audit pass) |
| 11 | Shadow language | Documented (codify the 4 RGBA shadows from the design-system doc) |
| 12 | Risk/warn/fail color tokens | Semantic role tokens mapped to Tailwind ramps |
| 13 | Muted-memorandum palette | Document the slate/forest/emerald roles in semantic terms |
| 14 | Print-safe contrast | Audit the four institutional shades against WCAG AA in B&W |
| 15 | Dark-mode dependency note | Plain-English impact note · no decision · no removal |
| 16 | Deprecated-tokens list | One-line `@deprecated` for tokens no consumer uses |

### 1.2 Non-goals (explicitly NOT Phase 1)

| # | Excluded | Why |
|---|---|---|
| 1 | Any new component | Foundation only; primitives layer is Phase 2 |
| 2 | Any visual redesign | Drift fixes only |
| 3 | Page migrations | Phase 3 territory |
| 4 | Dark-mode implementation | Decision deferred (see §7) |
| 5 | Rebrand or palette change | `forest` stays primary; `#005db7` stays as the editable signal |
| 6 | Retiring legacy `brand-*` purple palette | Out of scope; flagged as `@deprecated` only if confirmed unused |
| 7 | Renaming the existing color stops (`forest-900`, `forest-700`, `forest-50`) | Preserving institutional muscle memory |
| 8 | Touching admin's dark gradients | Phase 4 (token-only alignment, not Phase 1) |
| 9 | Restructuring shadcn CSS variables | Out of scope; verify they're dormant and leave alone |
| 10 | Editing the Mapbox / map color constants in `shared-map-card.tsx` | Branded map markers, not part of the design system |

---

## 2 · Findings · Current Token State

### 2.1 Baseline

| Surface | Codified today | Drift |
|---|---|---|
| `forest-{50,700,900}` palette | ✅ Tailwind + docs | None |
| `gold-{400,500}` palette | ✅ Tailwind | Reserved, not in active use |
| `brand-{50..950}` palette (purple) | ✅ Tailwind, marked legacy | Dashboard chrome only |
| Shadcn CSS vars (`--primary`, `--background`, etc.) | ✅ globals.css | Configured but **0 consumers** in components |
| `#005db7` editable blue | ❌ literal hex in 51 places, 18 files | **51 hardcoded literals** |
| Sticky offsets | ❌ literal Tailwind classes | 4 values drifting (`top-0/20/24/28`) |
| Z-index | ❌ literal | 12 distinct values used; no stratification rule |
| Max-widths | ❌ literal | 4 shell values in use |
| Badge sizes | ❌ component-scoped | 3+ size patterns drifting |
| Border-radius | ✅ Tailwind defaults | Consistent enough |
| Shadows | ✅ docs · ❌ code | 4 RGBA shadows documented; not centralized in Tailwind |
| `darkMode: "class"` | Configured | **Zero consumers** — dead code path |
| Print canvas | ✅ globals.css | Constants live in CSS; not exposed as CSS variables |

### 2.2 Critical observations

| # | Observation | Impact on Phase 1 |
|---|---|---|
| O1 | `brand-*` namespace is purple-blue legacy. Cannot reuse for `#005db7` | **Introduce `editable-*` namespace instead** |
| O2 | Shadcn `--primary` HSL = `234 89% 64%` ≈ purple (matches the legacy `brand`). The shadcn primary is already in use by *no one* | Leave alone in Phase 1; flag for retirement decision later |
| O3 | Zero `dark:` Tailwind variants in components. `.dark` class never applied | Dark-mode infra is dormant. Document, don't touch |
| O4 | AppHeader actual height ≈ 48px. Sticky offsets `top-{20,24,28}` (80/96/112 px) are intentional breathing room | Token names must reflect intent (rail vs report), not strict header alignment |
| O5 | All inline color hex literals are in Tailwind class brackets, not in `style={{ }}` props | Codemod-friendly. No AST manipulation needed |
| O6 | Border-radius docs in `colors-typography.md` claim a customized scale (`DEFAULT: 0.125rem`) that doesn't exist in `tailwind.config.ts` | **Doc–code divergence.** Fix the doc in Phase 1 |
| O7 | The 4 institutional RGBA shadows from the design-system doc are inline literals in components, not Tailwind shadow tokens | Introduce named shadow tokens to consolidate |
| O8 | Map markers in `shared-map-card.tsx` use 6 unique hex literals (#172B4D, #0052CC, #6554C0, #FF8B00, #7BD0CE, #00875A) | Branded map color set; **out of scope** for design tokens |
| O9 | `print:hidden` is used 240+ times consistently. Other print variants (`print:text-xs`, `print:shadow-none`, `print:p-N`) are sparse | Print system is essentially codified already |
| O10 | The library `favorites-table` uses a different sticky z-stack (z-40 head, z-30 col) than underwriting (z-[1]) and admin tables (z-[1]/z-10) | Z-index scale needs to expose a "sticky-table-head" role |

---

## 3 · Deliverable A · Token Map (Canonical Registry)

### 3.1 Color Tokens

#### 3.1.1 `editable-*` palette (NEW · semantic role)

The semantic role for `#005db7` is: **"operator can edit this value · or interact here · or upgrade through this affordance"**. The name `editable` describes the signal, not the hue.

**Tailwind extension (proposed):**

```ts
colors: {
  editable: {
    50:  "#eff5fb",   // bg behind a hover/edit indicator
    100: "#dbe7f4",   // editable cell background
    200: "#b9d0e8",   // editable border / ring
    300: "#8db1d8",   // disabled-editable
    400: "#5588c0",   // hover state
    500: "#246ab5",   // pre-anchor
    600: "#005db7",   // ★ canonical "operator can edit" — current literal
    700: "#004c95",   // active / pressed
    800: "#003b73",   // text on light background
    900: "#002a52",   // header label
    950: "#001735",   // ultra-dark accent (rare)
  },
}
```

**Role-to-class mapping (the 51 occurrences become):**

| Today's literal | Tomorrow's class |
|---|---|
| `text-[#005db7]` (28×) | `text-editable-600` |
| `bg-[#005db7]` (12×) | `bg-editable-600` |
| `border-[#005db7]` (6×) | `border-editable-600` |
| `ring-[#005db7]` (3×) | `ring-editable-600` |
| `ring-[#005db7]/50` (2×) | `ring-editable-600/50` |
| `bg-[#005db7]/10` (1×) | `bg-editable-600/10` |
| `border-[#005db7]/30` (1×) | `border-editable-600/30` |
| `bg-blue-50` (paired with editable text · 6×) | `bg-editable-50` (consolidates with role) |
| `ring-blue-200` (paired · 6×) | `ring-editable-200` |
| `bg-blue-100` (editable badge · 1×) | `bg-editable-100` |

**Reserved companion role:**

```ts
// CSS variable in globals.css (optional · added for shadcn parity)
--editable: 209 100% 36%;          // HSL of #005db7
--editable-foreground: 0 0% 100%;  // White on blue
```

This is **not required** for Phase 1 — the Tailwind palette alone suffices. Listed here for the record.

#### 3.1.2 `brand-*` (legacy purple · UNCHANGED)

Phase 1 does **not** touch the `brand` palette. It stays mounted on `apps/web/tailwind.config.ts:54-66`. A Phase 4 audit can decide whether to retire it.

#### 3.1.3 Risk / warn / fail palette (semantic role tokens)

These are **alias role tokens** pointing to existing Tailwind palettes. The names are role-only; the values are unchanged.

```ts
colors: {
  risk: {
    ok:      "rgb(var(--tw-color-emerald-700) / <alpha-value>)",   // emerald-700
    okBg:    "rgb(var(--tw-color-emerald-50) / <alpha-value>)",
    warn:    "rgb(var(--tw-color-amber-700) / <alpha-value>)",     // amber-700
    warnBg:  "rgb(var(--tw-color-amber-50) / <alpha-value>)",
    fail:    "rgb(var(--tw-color-rose-700) / <alpha-value>)",      // rose-700
    failBg:  "rgb(var(--tw-color-rose-50) / <alpha-value>)",
    info:    "rgb(var(--tw-color-slate-700) / <alpha-value>)",     // slate-700
    infoBg:  "rgb(var(--tw-color-slate-50) / <alpha-value>)",
  },
}
```

> **Note on implementation form.** Tailwind 3 cannot reference its own color tokens by name inside `theme.extend.colors`. The above is illustrative; the actual config will inline the hex values (`emerald-700` = `#047857`, etc.) with a comment pointing back to the source palette. Final form decided at Gate 1.

**Used by:** `ReconciliationBadge`, `RiskIndicator`, future `StatusBadge` consolidation. **51 occurrences** of inline emerald/amber/rose Tailwind classes already follow this exact role mapping; the role token harmonizes naming without changing any value.

#### 3.1.4 Muted memorandum palette

The institutional reading surface uses a tight slate-derived palette for body text + chrome. This is already codified via Tailwind defaults; Phase 1 documents the **roles**:

| Role | Tailwind | Use |
|---|---|---|
| `memo.text` | `slate-900` | Body text, headings (paired with `forest-900` for hotel names, totals) |
| `memo.text-muted` | `slate-600` | Section subtitles, captions |
| `memo.text-faint` | `slate-500` | Metadata, sub-labels |
| `memo.text-disabled` | `slate-300` | Inactive icons (per ui-principles.md §4) |
| `memo.surface` | white | Card body |
| `memo.surface-band` | `slate-50` | Header bands, hover row |
| `memo.surface-subtotal` | `slate-100` | SubtotalRow tone="subtotal" |
| `memo.border` | `slate-200` | All institutional 1px borders |
| `memo.border-strong` | `slate-300` | Strong row separators (`<table>` thead borders) |

**Phase 1 action:** documented in `docs/design-system/colors-typography.md` only. No Tailwind config change; the existing `slate-*` Tailwind classes continue to be used directly. The role names are author-facing convention, not a code-level abstraction.

#### 3.1.5 Print-safe contrast

Each role token must produce ≥ AA contrast (4.5:1) on white print paper. Phase 1 actions:

| Token | On white | Contrast | AA pass? |
|---|---|---|---|
| `editable-600` (#005db7) | 7.39:1 | ✅ |
| `forest-900` (#062C1C) | 16.94:1 | ✅ |
| `forest-700` (#0E4B31) | 9.91:1 | ✅ |
| `slate-900` | ~17:1 | ✅ |
| `slate-700` | ~9:1 | ✅ |
| `slate-600` | ~7:1 | ✅ |
| `slate-500` | ~5:1 | ✅ |
| `slate-400` | ~3.7:1 | ⚠️ (not for body text) |
| `slate-300` | ~2.4:1 | ❌ (decorative / disabled only) |
| `emerald-700` | ~5.2:1 | ✅ |
| `amber-700` | ~4.8:1 | ✅ |
| `rose-700` | ~5:1 | ✅ |

**Phase 1 action:** add this table to `colors-typography.md` and a one-line lint rule in the design-system doc: "Never use `slate-300` or lighter for body text — use it only for dividers, disabled icons, or decorative ornament."

### 3.2 Typography Scale (documentation only)

The scale documented in `colors-typography.md` (`text-[8px]` → `text-5xl` with `text-[13px]` as institutional body) is already what every page uses. **Phase 1 action: no Tailwind config change; align two outdated docs.**

| Action | File |
|---|---|
| Confirm canonical body size (`text-[13px]`) is unambiguous | `docs/design-system/colors-typography.md` (already done; no edit) |
| Fix the `borderRadius` documentation lie | Same file — `colors-typography.md:88-95` claims a customized radius scale that doesn't exist in `tailwind.config.ts`. Replace with the actual scale |
| Add a "print typography" subsection documenting the existing `print:text-xs` / `print:text-[6px]` (badge) / `print:text-[7px]` (forecast badge) occurrences | New subsection in `colors-typography.md` |

### 3.3 Spacing Scale

Tailwind's 4-px ramp is the canonical scale. No customization. **Phase 1 action: codify named spacing roles in the docs.**

| Role | Tailwind class | Pixel value |
|---|---|---|
| `space.chip` | `p-1.5` | 6 |
| `space.cell` | `px-3 py-2.5` | 12 / 10 |
| `space.cell-tight` | `px-3 py-1.5` | 12 / 6 |
| `space.cell-loose` | `px-4 py-3` | 16 / 12 |
| `space.card-tight` | `p-3` | 12 |
| `space.card` | `p-5` | 20 |
| `space.card-hero` | `p-8` | 32 (landing-only) |
| `space.section-pad` | `px-8 pt-8 pb-6` | 32 / 32 / 24 |
| `space.section-pad-print` | `print:px-4 print:pt-3 print:pb-2` | 16 / 12 / 8 |
| `space.section-gap` | `space-y-6` | 24 |
| `space.section-gap-print` | `print:space-y-0` | 0 |
| `space.memo-rhythm` | `space-y-8` between SectionShell instances | 32 |

**Phase 1 action:** add this table to `docs/design-system/ui-principles.md` as the canonical "spacing roles" reference.

### 3.4 Border-Radius

Current Tailwind config only customizes `lg/md/sm` via the shadcn `--radius: 0.5rem` CSS variable. All other radii are Tailwind defaults.

| Role | Class | Px | Use |
|---|---|---|---|
| `radius.button` | `rounded-md` | 6 | Buttons, inputs |
| `radius.card` | `rounded-2xl` | 16 | Cards, panels, paper |
| `radius.section` | `rounded-2xl` | 16 | SectionShell |
| `radius.input` | `rounded-sm` | 2 (after shadcn calc) | Form fields |
| `radius.badge` | `rounded-full` | 9999 | Pills, chips, dots |
| `radius.callout` | `rounded-xl` | 12 | Insight blocks, methodology notes |

**Phase 1 action:** docs only. No config change.

### 3.5 Shadows

Codify the 4 RGBA institutional shadows from `docs/design-system/ui-principles.md §5` as Tailwind boxShadow extensions so consumers stop inlining them.

```ts
boxShadow: {
  "memo-card":      "0 20px 40px rgba(0,51,30,0.06)",
  "memo-search":    "0 20px 40px rgba(6,44,28,0.08)",
  "memo-floating":  "0 20px 40px rgba(6,44,28,0.18)",
  "memo-pill":      "0 8px 24px rgba(0,51,30,0.08)",
  "memo-col-edge":  "2px 0 4px -2px rgba(0,0,0,0.04)",  // sticky-first-col right edge
}
```

Replaces 13 inline shadow literals across 14 files.

### 3.6 Sticky Offsets (CSS variables)

The sticky offsets are visual breathing room, not strict header alignment. Tokenize the **intent** rather than collapse to a single value.

```css
:root {
  --app-header-h:        3rem;    /* 48px · actual AppHeader height */
  --sticky-app:          0;       /* top-0 · AppHeader itself */
  --sticky-tight:        5rem;    /* 80px · KPI strip, scenario picker, filter bars */
  --sticky-rail:         6rem;    /* 96px · sidebars, drawers, bulk-action toolbars */
  --sticky-report:       7rem;    /* 112px · ReportSidebar (extra memo breathing) */
}
```

**Tailwind extension:**

```ts
spacing: {
  // ...
  "sticky-app":    "var(--sticky-app)",     // → top-sticky-app
  "sticky-tight":  "var(--sticky-tight)",
  "sticky-rail":   "var(--sticky-rail)",
  "sticky-report": "var(--sticky-report)",
},
```

So consumers write `sticky top-sticky-rail` instead of `sticky top-24`. **All 18 sticky-offset files map cleanly to one of the 4 tokens.**

| Current | Token replacement |
|---|---|
| `sticky top-0` (AppHeader) | `sticky top-sticky-app` |
| `sticky top-20` (FloatingKpiStrip, ScenarioPicker) | `sticky top-sticky-tight` |
| `sticky top-24` (sidebars, drawers — 6+ files) | `sticky top-sticky-rail` |
| `sticky top-28` (ReportSidebar) | `sticky top-sticky-report` |

### 3.7 Z-Index Scale

Replace 12 distinct z-index values (including the outliers `z-[60]`, `z-[200]`, `z-[210]`, `z-[1000]`) with a 7-step semantic scale.

```ts
zIndex: {
  base:      "0",
  raised:    "10",   // sticky-first-col in tables, table thead inside scrollable
  sticky:    "20",   // dropdowns, minor floating overlays
  overlay:   "30",   // floating KPI strip, scenario picker, bulk-action toolbar
  dropdown:  "40",   // dropdown menus, edit-mode-bar, table head when above col
  header:    "50",   // AppHeader, dialogs, modals
  drawer:    "60",   // article-drawer, agent-detail-panel
  toast:     "70",   // toaster (sonner)
  popover:   "80",   // contact-cell popup, tooltips
}
```

**80+ current usages map deterministically.** Outliers (`z-[200]`, `z-[1000]`) collapse into `drawer` or `popover` depending on context.

### 3.8 Max-Width System

Three shell types · three tokens. **Do not collapse them to one value.** The divergence is intentional (kiosk vs report vs admin); the token names just make it explicit.

```css
:root {
  --shell-report:  100rem;   /* 1600px · matches max-w-screen-2xl (1536px) → bumped to 1600 for parity with Library */
  --shell-admin:   87.5rem;  /* 1400px · admin operations density */
  --shell-prose:   48rem;    /* 768px · description / help text caps */
}
```

**Compromise note:** AppHeader currently uses `max-w-screen-2xl` (1536px). Library uses `max-w-[1600px]`. Snap-to-1600 is preferred for parity. **Pre-Gate-1 decision needed (see Q1 in §8).**

Tailwind extension:

```ts
maxWidth: {
  "shell-report": "var(--shell-report)",   // → max-w-shell-report
  "shell-admin":  "var(--shell-admin)",
  "shell-prose":  "var(--shell-prose)",
}
```

### 3.9 Badge Size Scale

```ts
fontSize: {
  "badge-xs": ["9px",  { lineHeight: "12px" }],
  "badge-sm": ["10px", { lineHeight: "13px" }],
  "badge-md": ["11px", { lineHeight: "14px" }],
}
```

Maps to existing usage:

| Today | Tomorrow |
|---|---|
| `text-[9px]` (sparkline labels, smallest chip) | `text-badge-xs` |
| `text-[10px]` (canonical institutional label · most common) | `text-badge-sm` |
| `text-[11px]` (mono codes, ZIP-style metadata) | `text-badge-md` |
| `text-xs` (12px · used heavily for "tier badge" and others) | **stays** `text-xs` — Tailwind default; only badges < 12px need the new scale |
| `text-sm` (14px · CapexDurationBadge — atypical) | **flagged** for visual review in Phase 1 — likely should drop to `text-badge-md` |

### 3.10 Table Density

```ts
spacing: {
  "row-compact":     "0.25rem",   // 4px · py-1
  "row-default":     "0.625rem",  // 10px · py-2.5
  "row-comfortable": "0.875rem",  // 14px · py-3.5
}
```

**Phase 1 does NOT touch existing table padding.** The tokens above are introduced as Tailwind spacing extensions so future tables (Phase 3 onward) consume named density. Existing tables stay untouched.

### 3.11 Print Spacing

Codify the existing print-spacing patterns from `report-paper.tsx`:

```ts
spacing: {
  "print-section-x": "1rem",      // 16px = print:px-4
  "print-section-t": "0.75rem",   // 12px = print:pt-3
  "print-section-b": "0.5rem",    // 8px  = print:pb-2
}
```

**Phase 1 action:** docs only. No find-and-replace yet (only 1 file uses these literally — too narrow to codemod profitably). Re-evaluate in Phase 2/3.

### 3.12 Memo Spacing Rhythm

The institutional memo rhythm (section padding + inter-section gap + memo cadence) is already codified in §3.3. The single new token here is the "inter-SectionShell gap":

```ts
spacing: {
  "memo-gap": "2rem",   // 32px · between SectionShell instances (matches space-y-8)
}
```

### 3.13 Deprecated Tokens List

| Token | Why deprecated | Removal target |
|---|---|---|
| `brand-{50..950}` (purple-blue palette) | Marked legacy in `colors-typography.md`; used only in dashboard chrome | Audit at Phase 4. **Not removed in Phase 1.** |
| Shadcn CSS variables (`--primary`, `--secondary`, `--accent`, `--card`, `--popover`) | Zero `bg-primary`, `text-foreground` references in components. Dead path | Audit at Phase 4. **Not removed in Phase 1.** |
| `darkMode: "class"` | Zero `dark:` consumers (see §7) | Decision deferred. **Not removed in Phase 1.** |
| `MetricRow` / `MetricTable` / `ReportSection` (primitive exports) | Zero consumers; flagged in synchronization audit | Removed in Phase 2 (primitive layer cleanup), not here |

---

## 4 · Deliverable B · Refactor Plan

### 4.1 File-by-file impact matrix

#### 4.1.1 `#005db7` migration · 18 files · 51 occurrences

| File | Occurrences | Risk |
|---|---|---|
| `apps/web/src/components/underwriting/sections/investment-section.tsx` | 15 | 🟢 mechanical |
| `apps/web/src/components/underwriting/sections/financing-section.tsx` | 2 | 🟢 |
| `apps/web/src/components/underwriting/primitives/year-row.tsx` | 1 | 🟢 |
| `apps/web/src/components/underwriting/primitives/year-grid.tsx` | 1 | 🟢 |
| `apps/web/src/components/underwriting/primitives/subtotal-row.tsx` | 1 | 🟢 |
| `apps/web/src/components/underwriting/primitives/section-shell.tsx` | 4 | 🟢 |
| `apps/web/src/components/underwriting/primitives/scenario-picker.tsx` | 2 | 🟢 |
| `apps/web/src/components/underwriting/primitives/initial-investment-block.tsx` | 1 | 🟢 |
| `apps/web/src/components/underwriting/primitives/floating-kpi-strip.tsx` | 3 | 🟢 |
| `apps/web/src/components/underwriting/primitives/editable-tile.tsx` | 2 | 🟢 |
| `apps/web/src/components/underwriting/edit/sortable-grid.tsx` | 3 | 🟢 |
| `apps/web/src/components/underwriting/edit/editable-text.tsx` | 2 | 🟢 |
| `apps/web/src/components/underwriting/edit/edit-mode-toggle.tsx` | 2 | 🟢 |
| `apps/web/src/components/underwriting/edit/edit-mode-bar.tsx` | 4 | 🟢 |
| `apps/web/src/components/report/financials/pl-content.tsx` | 1 | 🟢 |
| `apps/web/src/components/report/executive-summary/action-bar.tsx` | 1 | 🟢 |
| `apps/web/src/components/report/asset-analysis/capex/render-configurator.tsx` | 1 | 🟢 |
| `apps/web/src/components/report/primitives/pdf-export-button.tsx` | 1 | 🟢 |

#### 4.1.2 Sticky offset migration · 18 files

| File | Today | Tomorrow |
|---|---|---|
| `components/layout/app-header.tsx` | `sticky top-0` | `sticky top-sticky-app` |
| `components/underwriting/primitives/floating-kpi-strip.tsx` | `top-20` | `top-sticky-tight` |
| `components/underwriting/primitives/scenario-picker.tsx` | `top-0` | (already in sticky context; keep `top-0` if local; otherwise `top-sticky-tight`) |
| `components/report/shell/report-sidebar.tsx` | `top-28` | `top-sticky-report` |
| `components/library/library-sidebar.tsx` | n/a (internal scroll) | unchanged |
| `components/library/favorites-table.tsx` | `top-0` | `top-sticky-app` (within scroll container) |
| `components/admin/financials/dynamic-cap-rate-card.tsx` (sticky thead) | `top-0` | `top-sticky-app` |
| `components/admin/financials/acquisition-costs-card.tsx` | `top-0` | `top-sticky-app` |
| (6+ sidebars · settings/admin/contacts/agent/campaign/integration drawers) | `top-24` | `top-sticky-rail` |
| `components/underwriting/sections/*` (sticky-section-nav, if present) | `top-24` | `top-sticky-rail` |

#### 4.1.3 Z-index migration · ~40 files

The migration is mechanical: each `z-N` → its semantic name from §3.7. Outliers (`z-[60]`, `z-[200]`, `z-[210]`, `z-[1000]`) need 1-line judgment calls; **manually reviewed** at Gate 2.

#### 4.1.4 Shadow consolidation · 14 files

Replace inline RGBA shadows with named tokens. Examples:

| Today | Tomorrow |
|---|---|
| `shadow-[0_20px_40px_rgba(0,51,30,0.06)]` | `shadow-memo-card` |
| `shadow-[0_20px_40px_rgba(6,44,28,0.08)]` | `shadow-memo-search` |
| `shadow-[0_8px_24px_rgba(0,51,30,0.08)]` | `shadow-memo-pill` |
| `shadow-[2px_0_4px_-2px_rgba(0,0,0,0.04)]` | `shadow-memo-col-edge` |

#### 4.1.5 Max-width tokenization · 5 files

| File | Today | Tomorrow |
|---|---|---|
| `components/layout/app-header.tsx` | `max-w-screen-2xl` | `max-w-shell-report` |
| `components/report/shell/report-shell.tsx` | `max-w-screen-2xl` | `max-w-shell-report` |
| `components/report/shell/report-footer.tsx` | `max-w-screen-2xl` | `max-w-shell-report` |
| `components/library/library-shell.tsx` | `max-w-[1600px]` | `max-w-shell-report` |
| `app/user/admin/layout.tsx` + `components/settings/settings-layout.tsx` | `max-w-[1400px]` | `max-w-shell-admin` |

> Decision required (Q1 in §8): is the "shell-report" width 1536 (existing `screen-2xl`) or 1600 (existing library override)? Phase 1 prefers 1600 for parity.

### 4.2 Reversibility tiers

| Tier | Change | Reversible? | How |
|---|---|---|---|
| 🟢 Additive | Tailwind config extensions (new colors / spacing / shadow / z-index / fontSize entries) | Yes | Revert the config change |
| 🟢 Additive | CSS variable additions in globals.css | Yes | Revert the file change |
| 🟢 Mechanical | Find-and-replace `#005db7` literal → `editable-600` class | Yes | git revert; literal restored verbatim |
| 🟢 Mechanical | Sticky-offset class rename | Yes | git revert |
| 🟢 Mechanical | Shadow inline → `shadow-memo-*` | Yes | git revert |
| 🟡 Semi-reversible | Z-index outlier consolidation (e.g., `z-[200]` → `z-drawer`) | Yes, but value changes from 200 to 60 | Document old value in commit message |
| 🟡 Semi-reversible | Max-width `screen-2xl` → `shell-report` (1600) | If user picks 1600 over 1536, header layout widens by 64px on wide monitors | Reviewed at Gate 3 (visual diff) |
| 🟢 Doc-only | `colors-typography.md` border-radius doc fix | Yes | git revert |
| 🟢 Doc-only | All §3 documentation additions | Yes | git revert |

### 4.3 Migration order

```
Step 1 · Token registry (additive only)
  1.1  Add `editable-*` palette to tailwind.config.ts
  1.2  Add z-index scale to tailwind.config.ts
  1.3  Add boxShadow tokens to tailwind.config.ts
  1.4  Add maxWidth tokens to tailwind.config.ts
  1.5  Add fontSize badge tokens to tailwind.config.ts
  1.6  Add spacing tokens (memo-gap, row-*, sticky-*, print-section-*)
  1.7  Add CSS variables to globals.css (sticky offsets, max-widths)
  → No component file changes. Visual diff: zero.

Step 2 · Codemod #005db7 → editable-600  (51 occurrences · 18 files)
  → Visual diff: zero (color value unchanged).

Step 3 · Codemod sticky offset classes  (18 files)
  → Visual diff: zero (offset values unchanged).

Step 4 · Codemod shadow inline literals  (14 files)
  → Visual diff: zero (shadow values unchanged).

Step 5 · Codemod max-width classes  (5 files)
  → Visual diff: AppHeader / ReportShell / Footer widen from 1536→1600 IF Q1 resolves to 1600.
  → Pre-decision required.

Step 6 · Codemod z-index outliers (~10 files)
  → Manual review per file. No bulk replace.
  → Visual diff: zero behavioural change (z-order preserved).

Step 7 · Documentation pass
  → Fix `colors-typography.md:88-95` border-radius doc.
  → Add §3 token reference to `docs/design-system/`.
  → Add §7 dark-mode dependency note to `docs/design-system/`.
  → Update `docs/design-system.md` to point at new tokens.
  → Add changelog entry.
```

Each Step is its own PR. **Steps 1 and 2 are P0; Steps 3–7 are P1 in order.**

---

## 5 · Deliverable C · Preview Scope

### 5.1 Surfaces with zero pixel diff (the target)

Phase 1 is **non-visual**. The following surfaces must render byte-identical before/after:

- `/report/financials/underwriting` (reference page)
- `/report/financials/pl`
- `/report/executive-summary`
- `/report/asset-analysis`
- `/report/asset-analysis/capex`
- `/report/competitive-set`
- `/report/market-overview`
- `/library/favorites-map` / `/library/favorites-list` / `/library/top-map` / `/library/top-list`
- `/user/admin/financials`
- `/user/admin/contacts`
- `/user/admin/hotels`
- `/settings/investment` / `/settings/investment/market` / `/settings/investment/value`
- All other dashboard, settings, login, landing pages

**Verification:** screenshot-diff each surface (full-page) before and after each Step. Acceptable diff: ≤ 1px at sub-pixel rendering boundaries, ≤ 0px on any color, layout, or content surface.

### 5.2 Surfaces with intentional micro-changes

| Surface | Change | Reason |
|---|---|---|
| `AppHeader` max-width | 1536px → 1600px (`max-w-screen-2xl` → `max-w-shell-report`) | Q1 decision; +64px on wide monitors only · documented |
| `ReportShell` max-width | same as above | same |
| `ReportFooter` max-width | same as above | same |
| `CapexDurationBadge` text size | 14px → 11px (`text-sm` → `text-badge-md`) | One outlier in badge scale; brings it in line with sibling badges. **Flagged for Gate 3 visual confirmation.** |

**Both micro-changes are revocable at Gate 3.**

### 5.3 Surfaces with explicitly preserved behaviour

- Map markers in `shared-map-card.tsx` keep all 6 hex literals (#172B4D · #0052CC · #6554C0 · #FF8B00 · #7BD0CE · #00875A) — branded map color set, not a design system concern
- Background hex literals `#f6f8f7` (admin / settings / library bg) and `#f8f9fa` (library shell) — kept as literals pending Q3 decision
- Admin dark gradients (`bg-gradient-to-b from-forest-900 to-slate-950`) — untouched in Phase 1
- All `print:` variants — untouched (already codified)
- All `forest-*` and `gold-*` palette usage — untouched
- All shadcn CSS variables — untouched
- All `brand-*` (legacy purple) palette usage — untouched

---

## 6 · Deliverable D · Approval Gates

```
┌────────────────────────────────────────────────────────────────┐
│ GATE 0 · Plan approval                                         │
│ ────────────────────────────────────────────────────────────── │
│ Input:    THIS DOCUMENT                                        │
│ Decision: approve Phase 1 scope · approve token names ·        │
│           answer Q1–Q5 from §8                                 │
│ Output:   green-light to start Step 1                          │
│ Required:  operator                                            │
└────────────────────┬───────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ GATE 1 · Token registry PR (Step 1)                            │
│ ────────────────────────────────────────────────────────────── │
│ Input:    tailwind.config.ts + globals.css edits               │
│           (~80 LOC additive)                                   │
│ Checks:   - typecheck clean                                    │
│           - dev server renders identically (screenshot diff    │
│             on 5 reference pages)                              │
│           - no consumer change yet                             │
│ Output:   PR merged; tokens available to consumers             │
└────────────────────┬───────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ GATE 2 · Codemod PRs (Steps 2–6 · one per family)              │
│ ────────────────────────────────────────────────────────────── │
│ Input:    5 PRs · one per token family                         │
│           - PR 2.1: #005db7 → editable-600  (18 files)         │
│           - PR 2.2: sticky offsets           (18 files)        │
│           - PR 2.3: shadow consolidation     (14 files)        │
│           - PR 2.4: max-width tokens          (5 files)        │
│           - PR 2.5: z-index outliers         (~10 files,       │
│                     manual review)                             │
│ Checks per PR:                                                 │
│           - typecheck + build clean                            │
│           - lint clean                                         │
│           - reviewer eyeball-confirms class substitution       │
│             preserves visual                                   │
│ Output:   each PR merged independently                         │
└────────────────────┬───────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ GATE 3 · Visual diff confirmation                              │
│ ────────────────────────────────────────────────────────────── │
│ Input:    deployed preview environment                         │
│ Checks:   per-page screenshot diff (full-page web + print PDF) │
│           against §5.1 surfaces (zero diff target)             │
│           per-surface confirmation of §5.2 micro-changes       │
│ Output:   sign-off OR a per-surface revert list                │
│ Required:  operator                                            │
└────────────────────┬───────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ GATE 4 · Documentation pass + merge to main                    │
│ ────────────────────────────────────────────────────────────── │
│ Input:    docs/design-system.md + colors-typography.md +       │
│           ui-principles.md updates · changelog entry           │
│ Output:   Phase 1 closed · Phase 2 (primitive promotion)       │
│           unlocked but not auto-started                        │
└────────────────────────────────────────────────────────────────┘
```

**Each Gate is blocking.** No advancement without explicit approval.

---

## 7 · Dark-Mode Dependency Analysis (no decision)

**What exists today**

| Surface | What's there |
|---|---|
| `apps/web/tailwind.config.ts:4` | `darkMode: ["class"]` directive |
| `apps/web/src/app/globals.css:38-58` | `.dark { … }` block with 12 shadcn CSS variable overrides |
| Components | **Zero** `dark:` Tailwind variant usages |
| Components | **Zero** applications of the `.dark` class on any element or wrapper |
| Components | **Zero** consumers of the shadcn CSS variables (`bg-primary`, `text-foreground`, etc.) anywhere |
| Admin surfaces | Hard-coded forest-900 → slate-950 gradients (3 locations); not derived from `dark:` variants |

**If `darkMode: "class"` is removed from tailwind.config.ts**

| What breaks | What does not |
|---|---|
| Nothing today (zero consumers) | Admin dark gradients (use explicit `bg-gradient-to-b from-forest-900 to-slate-950` literals) |
| Future ability to flip an `.dark` class wrapper for instant dark-mode | All current rendering · all current styling |

**If `darkMode: "class"` is kept dormant**

| Risk | Reality |
|---|---|
| Dead code path persists | ~10 lines of config / 20 lines of CSS — negligible bundle impact (CSS variables are not emitted unless used) |
| Confusion for future contributors ("can I use `dark:bg-x`?") | Mitigated by a one-line note in `docs/design-system.md` |
| Drift risk if `dark:` consumers start landing in PRs without a system decision | Real; document the gate |

**Phase 1 recommendation: no removal, no decision.** Add a clear note in `docs/design-system.md`:

> **Dark mode is configured but inert.** The Tailwind `darkMode: "class"` toggle and the `.dark` shadcn variable block in `globals.css` are not consumed by any component. **Do not add `dark:` variants without a system-level dark-mode decision** — see §X of the relevant follow-up doc. Admin dark surfaces use explicit color tokens (`forest-900`, `slate-950`), not the `.dark` mechanism.

The decision (retire vs commit to dark mode) is its own initiative, separate from Phase 1.

---

## 8 · Open Questions / Decisions Needed Before Gate 1

| # | Question | Default | Owner |
|---|---|---|---|
| Q1 | Snap the shell-report max-width to 1600px (library parity) or keep 1536px (AppHeader parity)? | **1600px** — minor 64px widening on AppHeader and ReportShell on wide monitors; preserves library width; eliminates the third value | product |
| Q2 | Is the `editable-*` palette name acceptable, or do you prefer an alternative? Candidates: `signal`, `azure`, `interaction`, `memo-blue`, `report-blue` | **`editable-*`** — semantic role name | product |
| Q3 | Treat `#f6f8f7` (admin/settings light bg) and `#f8f9fa` (library shell bg) as token candidates or leave as literals? | **Leave as literals** for now; promote to `surface.app-bg` and `surface.library-bg` tokens in Phase 4 alongside admin token alignment | engineering |
| Q4 | Should the `CapexDurationBadge` text size drop from `text-sm` (14px) to `text-badge-md` (11px) for badge-scale consistency, or stay as an intentional outlier? | **Defer** to Gate 3 visual review; keep as-is during Phase 1; flag for the eventual badge-pass | product |
| Q5 | Keep `darkMode: "class"` dormant (and document) or remove now? | **Keep dormant** (zero consumers, zero cost to keep) | product |
| Q6 | Audit and retire the `brand-*` purple palette in Phase 1, or defer? | **Defer.** Verify no consumers in Phase 4 admin alignment, then retire | engineering |
| Q7 | Audit and retire the shadcn CSS variable consumers in Phase 1, or defer? | **Defer.** Same as Q6 | engineering |

---

## 9 · Implementation Sequence (gated · deploy-first ordering applied)

| Step | Action | Phase | Effort | Files | Status |
|---|---|---|---|---|---|
| 0 | Plan approval | — | — | — | ✅ Gate 0 closed |
| 1 | `tailwind.config.ts` token additions | **1A** | 0.25 d | 1 | ✅ Done |
| 1 | `globals.css` CSS variable additions | **1A** | 0.25 d | 1 | ✅ Done |
| 2 | Codemod `#005db7` → `editable-600` | **1B** | 0.5 d | 18 | ⏸ Deferred · post-deploy |
| 3 | Codemod sticky offsets | **1B** | 0.5 d | 18 | ⏸ Deferred · post-deploy |
| 4 | Codemod shadow inlines | **1B** | 0.25 d | 14 | ⏸ Deferred · post-deploy |
| 5 | Codemod max-widths | **1B** | 0.25 d | 5 | ⏸ Deferred · post-deploy |
| 6 | Consolidate z-index outliers | **1B** | 0.5 d | ~10 | ⏸ Deferred · post-deploy |
| 7 | Documentation pass | **1B** | 0.5 d | 4 docs | ⏸ Deferred · post-deploy |
| — | Visual diff per surface | (review) | — | — | ⏸ Deferred · post-deploy |

**Phase 1A · effort spent:** ~0.5 day.
**Phase 1B · remaining effort:** ~2.5 days, gated on post-deploy approval.

---

## 10 · Phase 1 Acceptance Criteria ("done")

At Phase 1 close, every surface meets these criteria:

1. ✅ Every `#005db7` literal in `apps/web/src/components/**` and `apps/web/src/app/**` is gone; replaced by `editable-*` class.
2. ✅ Every `sticky top-N` in those paths uses one of the four sticky-offset tokens.
3. ✅ Every documented institutional shadow uses a `shadow-memo-*` token.
4. ✅ Every shell max-width uses one of three `max-w-shell-*` tokens.
5. ✅ Every z-index is in the documented 7-step scale; outliers (`z-[60]`, `z-[200]`, `z-[210]`, `z-[1000]`) are gone.
6. ✅ `docs/design-system.md` and `docs/design-system/colors-typography.md` and `docs/design-system/ui-principles.md` are consistent with the actual `tailwind.config.ts` (zero divergence).
7. ✅ A single canonical "spacing roles" table exists in `ui-principles.md`.
8. ✅ A single canonical "WCAG print contrast" table exists in `colors-typography.md`.
9. ✅ A single canonical "dark-mode dependency" note exists in `design-system.md`.
10. ✅ Visual diff: zero on §5.1 surfaces; documented and approved on §5.2 surfaces.
11. ✅ `docs/changelog.md` has one entry per merged PR.
12. ✅ `docs/report/synchronization-audit-v1.md` is referenced in `ENTRYPOINTS.md` and `CLAUDE.md` as the parent initiative.

---

## 11 · Appendix · Full Token Registry

### 11.1 Tailwind config additions (proposed)

```ts
// apps/web/tailwind.config.ts (additions only; nothing removed)

theme: {
  extend: {
    colors: {
      // ★ NEW · editable / interaction signal · canonical #005db7 anchor
      editable: {
        50:  "#eff5fb",
        100: "#dbe7f4",
        200: "#b9d0e8",
        300: "#8db1d8",
        400: "#5588c0",
        500: "#246ab5",
        600: "#005db7",   // ★ canonical
        700: "#004c95",
        800: "#003b73",
        900: "#002a52",
        950: "#001735",
      },
      // ★ NEW · semantic role aliases (illustrative; final form decided at Gate 1)
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
    spacing: {
      "sticky-app":          "var(--sticky-app)",
      "sticky-tight":        "var(--sticky-tight)",
      "sticky-rail":         "var(--sticky-rail)",
      "sticky-report":       "var(--sticky-report)",
      "memo-gap":            "2rem",
      "row-compact":         "0.25rem",
      "row-default":         "0.625rem",
      "row-comfortable":     "0.875rem",
      "print-section-x":     "1rem",
      "print-section-t":     "0.75rem",
      "print-section-b":     "0.5rem",
    },
    maxWidth: {
      "shell-report": "var(--shell-report)",
      "shell-admin":  "var(--shell-admin)",
      "shell-prose":  "var(--shell-prose)",
    },
    boxShadow: {
      "memo-card":     "0 20px 40px rgba(0,51,30,0.06)",
      "memo-search":   "0 20px 40px rgba(6,44,28,0.08)",
      "memo-floating": "0 20px 40px rgba(6,44,28,0.18)",
      "memo-pill":     "0 8px 24px rgba(0,51,30,0.08)",
      "memo-col-edge": "2px 0 4px -2px rgba(0,0,0,0.04)",
    },
    fontSize: {
      "badge-xs": ["9px",  { lineHeight: "12px" }],
      "badge-sm": ["10px", { lineHeight: "13px" }],
      "badge-md": ["11px", { lineHeight: "14px" }],
    },
    zIndex: {
      base:     "0",
      raised:   "10",
      sticky:   "20",
      overlay:  "30",
      dropdown: "40",
      header:   "50",
      drawer:   "60",
      toast:    "70",
      popover:  "80",
    },
  },
},
```

### 11.2 globals.css additions (proposed)

```css
@layer base {
  :root {
    /* ★ NEW · sticky offset CSS variables */
    --app-header-h:   3rem;    /* 48px · AppHeader actual height */
    --sticky-app:     0;       /* AppHeader itself */
    --sticky-tight:   5rem;    /* 80px · KPI strips, scenario pickers, filter bars */
    --sticky-rail:    6rem;    /* 96px · sidebars, drawers, toolbars */
    --sticky-report:  7rem;    /* 112px · ReportSidebar (memo breathing) */

    /* ★ NEW · shell max-widths */
    --shell-report:   100rem;  /* 1600px · report + library */
    --shell-admin:    87.5rem; /* 1400px · admin operations density */
    --shell-prose:    48rem;   /* 768px · prose / help text caps */
  }
}
```

### 11.3 Files affected (summary)

| Family | Files | Total occurrences |
|---|---|---|
| `#005db7` → `editable-*` | 18 | 51 |
| Sticky offsets | 18 | 18 |
| Shadow inlines | 14 | 13 |
| Max-widths | 5 | 5 |
| Z-index outliers (manual review) | ~10 | ~12 |
| Tailwind config | 1 | 1 |
| globals.css | 1 | 1 |
| Docs | 4 | n/a |
| **Total touched files** | **~70** | — |

### 11.4 Reference docs (read before Gate 1)

- `docs/design-system.md`
- `docs/design-system/colors-typography.md`
- `docs/design-system/ui-principles.md`
- `docs/design-system/components.md`
- `docs/print-pdf.md`
- `docs/report/synchronization-audit-v1.md` (parent audit)

---

## 12 · Next Steps

1. **Operator reviews this plan** and answers Q1–Q5 (§8). Default answers are documented; if defaults are accepted, Gate 0 closes immediately.
2. **Operator approves the `editable-*` namespace name** (or proposes an alternative — `signal-blue`, `interaction-blue`, `memo-blue`, etc.).
3. **Operator approves the 1600px shell-report max-width** (or insists on 1536px parity with `screen-2xl`).
4. **Operator approves the dark-mode "keep dormant + document" recommendation.**
5. **No code change occurs until Gate 0 closes.**

After Gate 0 closes, Step 1 (Tailwind config + globals.css additions) is a 1-PR change with zero visual impact. Step 2 is the first codemod (51 hardcoded blue literals → token classes), still zero visual impact.

**Phase 1 supersedes any prior token plan and is the single reference for Gate 0 through Gate 4 decisions.**

---

*End of Phase 1 · Token Harmonization Plan · 2026-05-19*
