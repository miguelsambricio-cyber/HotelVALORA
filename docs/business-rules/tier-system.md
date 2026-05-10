# Business Rules · Tier System

Four user tiers, four UI behaviours. The tier is on `user.tier` (auth store) and drives both data visibility (locked cells) and feature gates (Upgrade primitives).

| Tier | Email convention (mock) | Badge color | What's unlocked |
|---|---|---|---|
| `free` | `free@…` | slate | Landing, single self-served valuation, public reports only |
| `pro` | `pro@…` | blue-700 | Hotel asset info, CompSET, market overview, IRR Project, private reports |
| `premium` | `premium@…` (also default for plain emails) | emerald-700 | CAPEX modelling, Underwriting & IRR Equity, AI imagery, full financial strategy |
| `institutional` | `institutional@…` (or `@institutional.test`) | amber-700 | Everything above + Top Promote marketplace publishing, multi-tenant, audit |

## Visual signals

The `TierBadge` in `AppHeader` renders the user's tier as a small uppercase chip (forest/blue/emerald/amber border + light bg). `apps/web/src/components/layout/app-header.tsx → TierBadge`.

## Data gating

### Library table (`/library/{favorites,top}-list`)

The visible financial columns depend on the **report's `reportType`**, not the viewer's tier. Today the viewer always sees everything the report exposes — there is no second-level gate.

Future: when real auth lands, the gate becomes "report.reportType vs user.tier" — e.g., a `free` user viewing a `Public` report sees today's lock pattern; a `premium` viewer of the same report would see one more level deep.

### Report sections (`/report/*`)

Premium gates are rendered via `UpgradeGate` / `UpgradeCard` primitives. They are `print:hidden` so PDF exports never show "upgrade required" placeholders.

## Investment criteria (Settings)

The Investment Requirements surface (`/settings/investment/*`) uses tier internally too:

- Some sliders / fields are wrapped in `BasicPremiumPicker` — a 2-position toggle (Basic / Premium) that reveals editable tables when on Premium.
- `Acquisition Cost` line-item table is **Premium-only**.
- `Management Fee` Base + Incentive structure is **Premium-only**.

## Upgrade CTAs

Every locked surface has a clear "Upgrade to {tier}" path. Today they emit a sonner toast; Phase 5 wires the marketplace payment flow.

## Cross-references

| Topic | Doc |
|---|---|
| User model | `docs/data-models/user-models.md` |
| Report visibility (independent axis) | `docs/business-rules/report-visibility.md` |
| Top Promote system | `docs/business-rules/promoted-reports.md` |
| Locked-cell pattern | `docs/data-models/library-models.md` |
