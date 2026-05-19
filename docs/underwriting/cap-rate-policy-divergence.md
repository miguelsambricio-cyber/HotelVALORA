# Cap Rate Engine · Policy Divergence (DEFERRED · post-merge refactor)

> Documented 2026-05-19 · refactor deferred until the underwriting page lands on `main`.

## Summary

The HotelVALORA underwriting platform currently runs **two parallel cap-rate computation systems** with different coefficients. The admin policy panel is supposed to be the source of truth, but the underwriting engine ignores it and uses its own hardcoded values.

Numerical coincidences in the base scenario mask the divergence — both systems produce ~6,45% for the default Madrid Centro 4★ asset, but they get there through different math.

**This is institutional architectural debt. Engine consumption of admin policy is the correct end state.**

---

## The two systems

### Admin policy (source-of-truth, expected role)

**File**: `apps/web/src/lib/admin/financials/dynamic-cap-rate-policy.ts`

- `DYNAMIC_CAP_RATE_POLICY_DEFAULTS` · 9-cell matrices (category × size) for each adjustment line.
- Editable via `/user/admin/financials` Dynamic Cap. Rate card with `useDraftedOverrides` + localStorage persistence.
- Currently **only consumed by the admin preview** (`computeForCell`). The underwriting engine ignores it.

### Underwriting engine (consumer, current implementation)

**File**: `apps/web/src/lib/underwriting/cap-rate-engine/adjustments/index.ts`

- `buildAdjustments(asset, evidence, scenarioId, side)` · pure functions returning `CapRateAdjustment[]`.
- Coefficients **hardcoded** in TypeScript (`if asset.category === "5star" ? -0.25 : ...`).
- Base yield read from `evidence.median_cap_pct` (computed from seeded comparable transactions), not from `policy.base_market_yield_pct`.
- The result lands on `bundle.computed.cap_rate.entry.used_pct` — the number the UI displays as "Dynamic Cap Rate · Entry".

---

## Divergence table (Madrid Centro · 4★ · +200 keys · Renovated · Mercado · Euribor 2,75%)

| Adjustment | Admin policy | Engine | Aligned? |
|---|---:|---:|:---:|
| Base yield | 6,50% (default) · operator-editable | ~6,20-6,35% · median of seeded Madrid Centro 4★ comps | ✗ |
| Category · 4★ large | 0,00% | 0,00% | ✓ |
| Size · 4★ +200 keys | **−0,25%** | **−0,10%** | ✗ |
| Renovation · non-capex 4★ +200 | **+0,25%** | **0,00%** (for `renovated` state) | ✗ |
| Operator · branded chain | — (factor doesn't exist in policy) | **−0,10%** (assumed default) | ✗ |
| Macro · Euribor 2,75% vs LT 1,50% | +0,25% (20 bps per 100 bps Euribor) | +0,25% (same formula) | ✓ |
| Liquidity · ≥6 deals/12m | — (factor doesn't exist in policy) | **−0,05%** | ✗ |
| Scenario · base | 0,00% | 0,00% | ✓ |

### What the user sees today

Card displays **6,45%**. This is:
- ✅ Consistent with admin policy IF base = 6,20% (operator-supplied), via `6,20 + 0 − 0,25 + 0,25 + 0 + 0,25 = 6,45`.
- ✅ Consistent with engine output, via a different path: engine_base (~6,20-6,35%) + 0 (category) − 0,10 (size) + 0 (renovation) − 0,10 (operator) + 0,25 (macro) − 0,05 (liquidity) + 0 (scenario) ≈ engine_base + 0,00.
- ❌ NOT derived from admin policy at all. Coincidence.

### What the user would expect from admin defaults

If admin policy is the source of truth and the engine consumed it correctly, with `base_market_yield_pct = 6,50%` (admin default), the same asset would price at:

`6,50 + 0 − 0,25 + 0,25 + 0 + 0,25 = 6,75%`

The card would show **6,75%**, not 6,45%.

---

## Refactor plan (deferred · post-merge)

### Phase 1 · Engine consumes policy

1. `buildAdjustments` accepts a `policy: DynamicCapRatePolicy` parameter (currently it has no policy input).
2. Map `asset.category + asset.rooms` → `(StarCategoryId, SizeTierId)` cell coordinates.
3. Map `asset.state` → `RenovationOptionId` (`renovated` → `non-capex`, `needs_work` → `capex`, `new` → new option to add).
4. Map `scenarioId` → `ScenarioOptionId` (`base` → `base`, `downside` → `conservative`, `upside` → `aggressive`).
5. Read every adjustment from `policy.{category,size,renovation,scenario}_adjustment[…][category][size]`.
6. Macro formula reads `policy.macro_bps_per_100bps_euribor` + `policy.macro_long_term_mean_pct`.
7. Base yield: choose policy contract — either `policy.base_market_yield_pct` (operator-defined) or `evidence.median_cap_pct` (data-derived). Open question for product owner.

### Phase 2 · Resolve missing factors

Admin policy lacks `operator` and `liquidity` adjustments that the engine applies. Two paths:

- **A** — Extend `DynamicCapRatePolicy` with `operator_adjustment` (matrix by category × size for branded vs independent) and `liquidity_adjustment` (matrix by liquidity band). Admin UI gains two new editable matrices.
- **B** — Drop both from the engine. Operator effect rolls into category positioning; liquidity rolls into size band. Simpler policy, slight loss of granularity.

Recommend **A** — institutional underwriting wants operator + liquidity as discrete signals.

### Phase 3 · Wire bundle.inputs.acquisition.cap_rate.policy

`UnderwritingInputs.acquisition.cap_rate` already has `manual_override_pct` + `use_dynamic`. Add an optional `policy: DynamicCapRatePolicy` field so the engine can be called with a specific policy snapshot. Default to `DYNAMIC_CAP_RATE_POLICY_DEFAULTS` when absent. Future Supabase storage of `policy` per workspace.

### Phase 4 · Confidence + evidence stays in engine

The `evidence/` and `confidence/` layers of the engine continue to live in `lib/underwriting/cap-rate-engine/`. Those are not part of the admin policy — they're data-derived from comparable transactions + scoring algorithms. Policy + evidence + confidence remain three distinct layers.

### Phase 5 · UI

Once the engine consumes policy, the underwriting card's display becomes truly traceable to admin/financials. The "View methodology" disclosure could optionally link to the specific cells that drove the recommendation. For now the disclosure already links to `/user/admin/financials` correctly.

---

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-19 | Defer refactor until underwriting page merges to `main` | Avoid scope-creep on the UI work-in-progress · engine refactor is a 1-2 day block on its own with parity validation |
| 2026-05-19 | UI to make the divergence invisible (memo aesthetic) | The "View methodology" disclosure describes factors conceptually · no numeric deltas exposed · operator doesn't see the inconsistency in the current build |
| 2026-05-19 | Calibration source link points to `/user/admin/financials` already | Once Phase 1 ships, the link is honest · for now it's slightly aspirational |

---

## Files affected by the eventual refactor

| File | Change |
|---|---|
| `lib/underwriting/cap-rate-engine/adjustments/index.ts` | Accept policy param · read from matrices instead of hardcoded values |
| `lib/underwriting/cap-rate-engine/index.ts` | Thread policy through `runDynamicCapRate(ctx)` |
| `lib/underwriting/cap-rate-engine/types.ts` | Update `RunCapRateContext` to carry policy |
| `lib/underwriting/engine/cap-rate.ts` | Pass policy to engine module |
| `lib/admin/financials/dynamic-cap-rate-policy.ts` | Extend with `operator_adjustment` + `liquidity_adjustment` matrices (Phase 2 path A) |
| `components/admin/financials/dynamic-cap-rate-card.tsx` | New matrices in admin UI |
| `lib/underwriting/types.ts` | Add `acquisition.cap_rate.policy?: DynamicCapRatePolicy` |
| `lib/underwriting/defaults.ts` | Set the default policy on `INPUTS_BASE` |
| `docs/underwriting/excel-parity-block-3a.md` + `-3b.md` | Re-run parity reports against the new methodology |
| `lib/underwriting/versioning.ts` | Bump `ENGINE_VERSION` 0.2.0 → 0.3.0 (engine math changes when policy supersedes hardcoded values) |

---

## Acceptance test (when refactor lands)

Manual verification:

1. Edit `policy.base_market_yield_pct` in admin to **6,80%**.
2. Save.
3. Navigate to `/report/financials/underwriting`.
4. Confirm the displayed Dynamic Cap Rate moves correspondingly.
5. Try changing `size_adjustment["4star"]["large"]` from -0,25 → -0,50.
6. Confirm the cap rate drops by 0,25 percentage points.
7. Try switching scenario in the page to Conservador.
8. Confirm `scenario_adjustment["conservative"]["4star"]["large"]` is applied.

All four roundtrips currently fail (admin edits have zero effect on underwriting display). Acceptance = all four pass.
