# Business Rules

> ❄️ **FROZEN · 2026-05-19**
>
> **Status:** frozen · do not update
> **Reason:** This file is a flat root-level summary from before the `business-rules/` folder existed. The tier · visibility · promoted-reports rules now live in dedicated dossiers with deeper detail. Sections like Locked Gates, PDF/Print Rules, Workflow Gates and Map Layers below are historical and may not reflect current implementation.
> **Canonical replacements:**
> - **Tier system + Premium gates:** `docs/business-rules/tier-system.md`
> - **Report visibility axes (private / public / top-promote):** `docs/business-rules/report-visibility.md`
> - **Top Promote marketplace logic:** `docs/business-rules/promoted-reports.md`
> - **PDF / print mechanics:** `docs/print-pdf.md`
> - **Map layers (CompSet + stylised pin):** `docs/architecture/map-engine.md` + `docs/maps.md`
>
> Inbound links in `CLAUDE.md`, `ENTRYPOINTS.md`, `component-library.md`, `report-system.md` that still reference this file should be updated to one of the canonical replacements above. Content below is preserved as a historical snapshot.

---

## Premium Tier System

Three tiers gate access to report sections:

| Tier | Label | Color |
|---|---|---|
| FREE | — | — |
| PRO | PRO | Blue |
| PREMIUM | PREMIUM | Gold / Emerald |

---

## Locked Gates

Component: `LockedGate` (`components/report/ui/locked-gate.tsx`)

Renders a blurred overlay over locked table rows with a tier badge and upgrade CTA.

Usage pattern:
```tsx
<LockedGate
  rows={["Row Label 1", "Row Label 2"]}
  tier="PRO" | "PREMIUM"
/>
```

Always placed after the visible rows in a section. Hidden in print (`print:hidden`).

### Locked sections per report area

| Section | Locked rows | Tier |
|---|---|---|
| Asset Analysis | "Hotel Personalizado", "CAPEX & Renders" | PREMIUM |
| Market Overview | "Hotel & Market Overview", "Projects", "Transactions" | PRO |
| Hotel Valuation | "P&L Premium", "Underwriting & IRR Equity" | PREMIUM |

---

## PDF / Print Rules

- Locked gates are removed from PDF (`print:hidden`) — upgrade prompts are irrelevant in a printed document.
- All report content in visible (unlocked) sections is always included in the PDF regardless of tier.
- `ActionBar` (FAVORITOS / GUARDAR / UPGRADE) is removed from PDF.

---

## Workflow Gates

- Users must complete CompSet selection before accessing the Executive Summary.
- "Confirmar CompSet →" button in `CompetitorPanel` navigates to `/report/executive-summary`.
- No auth guard is implemented yet on the report route (open in current build).

---

## Report Data

- All data is currently mocked in `src/lib/report/executive-summary-data.ts`.
- Production: replace with `GET /api/v1/reports/{id}` response.
- Valuation range displayed as `€X.XM — €X.XM` (low–high band).
- Scenario label is a string (e.g., "Base Case", "Conservative").

---

## CompSet Rules

- Reference hotel: always visible, non-removable, renders as distinct pin color.
- Competitors: user-curated from suggested list; displayed in panel + on map.
- Suggested: AI-generated; user can add to active competitors.
- Layer toggles: Heatmap, Transport Lines, Historic Center — independent boolean per layer.
- Panel state: open/closed, persists within session via `useState` in `useCompset`.

---

## Map Layers

| Layer | ID | Default |
|---|---|---|
| Heatmap | `heatmap` | off |
| Transport Lines | `transport` | off |
| Historic Center | `historic` | off |

Managed by `layers` object in `useCompset`. Toggled via `toggleLayer(id)`.
