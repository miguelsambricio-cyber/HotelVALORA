# P&L Data Divergence · Standalone P&L Page ↔ Underwriting Engine

> 2026-05-19 · Headline tiles unified · table-row unification DEFERRED to post-merge.

## Current state

Two parallel P&L computations exist in the platform:

| Surface | Computation | Data shape |
|---|---|---|
| `/report/financials/pl` (standalone P&L) | `computePL(getDefaultAssumptions())` from `lib/report/financials/calculations.ts` | 5-year horizon · `lineItems[id]` (rev-rooms, rev-fb, exp-rooms, exp-fb, exp-admin, …) + `results.{totalRevenue, gop, ebitda, ebitdaMargin}` |
| `/report/financials/underwriting` Section 02 | Engine `pnl.ts` reading `inputs.pl_drivers.gop` + `inputs.pl_drivers.costs` (hardcoded 11-year arrays) | 11-year horizon · per-period series (`hotel`, `fb`, `other_departments`, `gross_operating_profit`, `mgmt_fee`, `property_taxes`, `property_insurance`, `ffe_reserve`, `ebitda_after_replacement`, …) |

The two systems use **different assumptions**, **different period axes** (5y vs 11y), and **different line-item granularity**.

## What is unified today (Section 02 headline tiles)

After this iteration, the Section 02 headline grid reads from the standalone P&L page:

```ts
const plPage = computePL(getDefaultAssumptions());
const plStabilizedIdx = 2; // Year 3 · stabilised
const stabilisedGop      = plPage.results.gop[plStabilizedIdx];
const stabilisedEbitda   = plPage.results.ebitda[plStabilizedIdx];
const stabilisedRevenue  = plPage.results.totalRevenue[plStabilizedIdx];
const gopMarginPct       = stabilisedGop / stabilisedRevenue * 100;
const ebitdaMarginPct    = plPage.results.ebitdaMargin[plStabilizedIdx] * 100;
const ebitdaPerKey       = stabilisedEbitda / asset.rooms;
```

The 4 headline tiles (Stabilised GOP · GOP Margin · EBITDA Margin · EBITDA per key) now match the P&L page exactly.

## What is NOT yet unified (5-year table + downstream sections)

- The Section 02 5-year table still consumes `bundle.computed.pnl` (engine PNL module · 11-year arrays).
- All downstream sections (Balance Sheet · Cash Flow · DTA · Exit · IRR) consume the engine PNL too — they depend on the engine-derived series for reconciliation invariants.
- Result: the **headline tiles match the P&L page**, but the **5-year table breakdown rows** (Hotel · F&B · Other departments · Management Fee · etc.) and all reconciliation flowing from PNL into BS / CF / IRR remain engine-driven.

This is a known, documented inconsistency. The institutional priority (matching headline numbers) is satisfied; the deeper architectural unification needs a real engine refactor.

## Refactor plan (post-merge)

### Phase 1 · Engine consumes P&L page assumptions

1. Add `pl_assumptions?: PLAssumptions` to `UnderwritingInputs` (default to `getDefaultAssumptions()` in SCENARIO_BASE).
2. Update `engine/pnl.ts` to:
   - Run `computePL(inputs.pl_assumptions)` internally.
   - Project the 5-year results to the 11-year period axis (Y0 = 0 during acquisition · Y1..Y5 from P&L page · Y6..Y10 = Year 5 value held constant or extrapolated at terminal growth).
   - Derive the engine's existing fields (`hotel`, `fb`, `other_departments`, `gross_operating_profit`, `mgmt_fee`, `property_taxes`, `property_insurance`, `ffe_reserve`, `ebitda_after_replacement`) from the P&L page's line items via a stable mapping.

### Phase 2 · Line-item mapping registry

Build a `lib/underwriting/pnl-mapping.ts` that defines:

| Engine field | P&L page derivation |
|---|---|
| `hotel` (revenue) | `lineItems['rev-rooms']` (rooms revenue) |
| `fb` (revenue) | `lineItems['rev-fb']` |
| `other_departments` (revenue) | `lineItems['rev-meeting'] + lineItems['rev-spa'] + lineItems['rev-parking-other']` |
| `gross_operating_profit` (subtotal) | `results.gop` |
| `mgmt_fee` | `lineItems['exp-mgmt-fee']` × totalRevenue |
| `property_taxes` | `lineItems['exp-property-tax']` × totalRevenue |
| `property_insurance` | ? not directly mapped today · may need new line in P&L page |
| `ffe_reserve` | `lineItems['exp-ffe-reserve']` × totalRevenue |
| `ebitda_after_replacement` (subtotal) | `results.ebitda` |

Open mapping questions for product owner:
- Should `hotel` mean rooms revenue (P&L page split) or rooms department GOP (engine convention)?
- Does `property_insurance` need a dedicated line in the P&L page, or should it be folded into another category?

### Phase 3 · Drop `pl_drivers` from inputs

Once the engine consumes `pl_assumptions`, the legacy hardcoded `pl_drivers.gop` and `pl_drivers.costs` arrays can be deleted from `INPUTS_BASE` and the type. Engine is no longer dual-source.

### Phase 4 · Engine version + parity

- Bump `ENGINE_VERSION` from `0.2.0` to `0.3.0` — P&L semantics changed, snapshots from prior versions will recompute differently.
- Re-run Excel parity reports (`docs/underwriting/excel-parity-block-3a.md` and `-3b.md`) against the new mapping.

### Phase 5 · UI side-effect

After Phase 1-3, the Section 02 5-year table automatically matches the P&L page (since the engine output is derived from P&L page inputs). No UI change needed beyond verifying the row labels read sensibly.

## Acceptance test (when refactor lands)

Manual verification:

1. Open `/report/financials/pl`. Note the Stabilised GOP (Year 3) value.
2. Open `/report/financials/underwriting` Section 02. Note the Stabilised GOP tile.
3. Both numbers identical. ✅ (already true today after this iteration)
4. Note the 5-year P&L table values in `/pl` for Year 1 (Rooms revenue, F&B revenue, Total Revenue, GOP, EBITDA).
5. Note the same Year 1 values in the Section 02 5-year table.
6. All line-item values identical. ✅ (NOT true today — requires Phase 1-3)
7. Change Occupancy in `/pl` from 65% to 70%. Save.
8. Reload `/report/financials/underwriting`. Stabilised GOP + EBITDA tiles reflect the new P&L. ✅ (NOT true today — requires P&L page draft persistence to be visible to the engine, which depends on whether assumptions are stored in localStorage and shared)

Acceptance = points 6 and 8 both pass.

## Related documents

- `docs/underwriting/cap-rate-policy-divergence.md` — same architectural pattern · admin/financials cap-rate policy ↔ underwriting engine cap-rate computation.
- `docs/underwriting/irr-layer-separation.md` — Project IRR vs Equity IRR semantics.
- `docs/underwriting/phase-model.md` — temporal model alignment.

## Files touched in this iteration (headline-only fix)

| File | Change |
|---|---|
| `components/underwriting/sections/pnl-section.tsx` | Headline tiles consume `computePL(getDefaultAssumptions())`. Stabilised EBITDA tile removed (margins are now the institutional anchor). |
| `components/underwriting/sections/executive-summary-section.tsx` | Dynamic Cap Rate tile is now editable (sets `cap_rate_entry_pct` override). |
| `docs/changelog.md` | Logged the headline unification + deferred table refactor. |
