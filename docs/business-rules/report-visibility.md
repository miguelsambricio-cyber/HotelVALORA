# Business Rules · Report Visibility

A report has two independent axes:

1. **`reportType`** — the tier / pricing surface (Premium / PRO / Public / Private)
2. **`visibility`** — who can see it at all (private / team / public / top-promote)

## `visibility` (`ReportVisibility` type)

| Value | Meaning |
|---|---|
| `private` | Only the owner can see the report |
| `team` | Owner + workspace team members |
| `public` | Anyone (subject to `reportType` gating of values) |
| `top-promote` | Public + paid promotion slot (extra surfacing) |

## `reportType` (`ReportTypeBadge` type)

Defines the depth of data the viewer sees:

| Value | What viewers see |
|---|---|
| `Premium` | Everything |
| `PRO` | Most things; CAPEX + IRR Equity locked |
| `Public` | Only Cap Rate + Market Value TTM; rest locked |
| `Private` | Same lock pattern as Public; chip is white-on-blue-border |

The lock pattern is enforced at the *data layer* — `financials.<field>` is `null` for any value the viewer shouldn't see. The UI renders a `<LockedCell />` whenever the value is null.

## `visibilityTier` (forward-compat — `VisibilityTier` type)

Distinct from both `visibility` and `reportType`. Drives the Top Reports marketplace surfacing:

| Value | UI surface |
|---|---|
| `promoted` | Top of marketplace, lime marker, fire indicator |
| `institutional` | Verified institutional partner, forest marker |
| `community` | Public community contribution, blue marker |
| `verified` | Auto-validated public report, teal marker |

Not currently rendered as a badge — it's the future marketplace ranking input. Today it's populated per hotel in mock data.

## `indicators` (per-report metadata)

```ts
{
  topPromote: boolean;      // active paid promotion → fire icon next to chip
  userModified: boolean;    // user has edited the auto-generated report → edit icon
  private: boolean;         // private-only (mirrors visibility = private)
}
```

These render as small Lucide glyphs next to the Report Type chip in the list views: `Flame` / `Edit3` / `EyeOff`.

## Cross-references

| Topic | Doc |
|---|---|
| Tier system (independent axis) | `docs/business-rules/tier-system.md` |
| Top Promote payment / expiry rules | `docs/business-rules/promoted-reports.md` |
| `LibraryReport` shape | `docs/data-models/report-models.md` |
