# Business Rules

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
