# Business Rules · Promoted Reports ("Top Promote")

"Top Promote" is the revenue surface — users pay to surface their public report on the Library map + Top Reports list.

## Today's wiring (mock)

- Per-report flag: `indicators.topPromote: boolean`
- Promotion metadata: `promotion: ReportPromotion` (see `docs/data-models/report-models.md` §Sub-shapes)
- Floating card on the map: TOP PROMOTE chip renders when `promotion.promoted === true`
- Marker animation: TOP PROMOTE markers pulse via `animate-pulse`
- List-view chip indicator: `Flame` icon next to the Report Type chip
- Contact card: only top-promoted reports surface a contact card popover

## Promotion shape

```ts
interface ReportPromotion {
  promoted: boolean;
  promotedUntil?: string;       // ISO 8601 — expiration
  boostScore?: number;          // 0-100 ranking weight
  featuredRegion?: string;      // ISO region/market id
  impressions?: number;         // telemetry
  clicks?: number;              // telemetry
}
```

## Mock distribution

| Hotel | promoted | promotedUntil | boostScore |
|---|---|---|---|
| Ritz-Carlton Madrid | true | 2026-12-31 | 92 |
| Mandarin Oriental Ritz | true | 2026-09-30 | 95 |
| Four Seasons Madrid | false | — | — |
| The Madrid EDITION | false | — | — |
| Hard Rock Marbella | false | — | — |
| W Barcelona | false | — | — |

## Phase 5 (Marketplace) rules — planned

When the payment surface lands:

1. **Tier gate** — only `premium` and `institutional` users can purchase a Top Promote slot.
2. **Duration** — 30 / 90 / 180-day terms, monthly auto-renewal.
3. **Expiration** — `promotedUntil` is enforced server-side; the daily cron flips `promoted = false` after expiry. Reports show a soft "Renewal due" banner 7d before.
4. **Boost score** — derived from sponsor priority + engagement, **not** purchasable directly. Sponsors with higher `sponsorPriority` (paid premium slot) win marker placement when slots collide.
5. **Telemetry** — `impressions` increments on every map render that draws the marker; `clicks` on every floating-card open OR contact-card hover.
6. **Featured region** — optional ISO market id (`ES-MAD`, `ES-CAT`, etc.) — used by the upcoming "Featured in your market" surface.

## Cross-references

| Topic | Doc |
|---|---|
| Visibility rules (independent axis) | `docs/business-rules/report-visibility.md` |
| Tier system | `docs/business-rules/tier-system.md` |
| Report shape | `docs/data-models/report-models.md` |
| Roadmap Phase 5 | `docs/roadmap/master-roadmap.md` |
