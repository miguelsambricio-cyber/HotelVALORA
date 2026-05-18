# Dynamic Cap Rate Engine · architecture

CORE IP of HotelVALORA · the institutional intelligence layer that
converts comparable-transaction evidence into a defensible cap-rate
recommendation with rationale, confidence and audit trail.

**Module**: `apps/web/src/lib/underwriting/cap-rate-engine/`

## 5-layer architecture

Each layer is a pure function that consumes the prior layer's typed
output. No layer reaches into another. All deterministic — same inputs
+ same engine version → byte-identical outputs.

```
   ┌──────────────────────────────────────────────────────────────┐
   │ CapRateEngineContext                                          │
   │   asset · scenario_id · override · rates_regime · comps · side │
   └────────────────────────────┬─────────────────────────────────┘
                                ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 1 · Market Evidence Layer                                     │
   │   evidence/index.ts → buildMarketEvidence                      │
   │   · filter: staleness > 36m · category gap > 1 · size > 5×    │
   │   · scope: submarket → market → national fallback             │
   │   · derive: median · mean · IQR · stddev · liquidity 12m/24m   │
   │   · capture: every exclusion + reason for audit traceability   │
   └────────────────────────────┬─────────────────────────────────┘
                                ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 2 · Adjustment Policy Layer                                   │
   │   adjustments/index.ts → buildAdjustments                      │
   │   8 named adjustments · each a typed CapRateAdjustment:        │
   │     · base · category · size · renovation                      │
   │     · operator · macro · liquidity · scenario · side           │
   │   Sign convention: +pp widens cap rate (conservatism)          │
   └────────────────────────────┬─────────────────────────────────┘
                                ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 3 · Confidence Engine                                         │
   │   confidence/index.ts → buildConfidence                        │
   │   Composite 0-100 weighted blend:                              │
   │     · sufficiency 30% · # comps                                │
   │     · volatility  25% · IQR spread / median                     │
   │     · staleness   20% · age of most recent comp                │
   │     · coverage    25% · submarket + category match share       │
   │   Band: very_low (<30) · low · medium · high · very_high (≥85) │
   └────────────────────────────┬─────────────────────────────────┘
                                ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 4 · Explainability Layer                                      │
   │   rationale/index.ts → buildRationale                          │
   │   Structured RationaleTrace + auto-generated narrative         │
   │   · base_market_yield + source                                 │
   │   · adjustments_applied + total_delta                          │
   │   · recommended_pct + band (widens with low confidence)        │
   │   · evidence_used + evidence_excluded summaries                │
   │   · confidence breakdown                                       │
   │   · narrative · one-paragraph operator-grade text              │
   └────────────────────────────┬─────────────────────────────────┘
                                ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 5 · Override Layer                                            │
   │   overrides/index.ts → buildOverride                           │
   │   · enabled · manual_value_pct · operator_rationale            │
   │   · operator_email · applied_at · delta_vs_recommended_pct     │
   │   · audit-grade trail for committee defense                   │
   └────────────────────────────┬─────────────────────────────────┘
                                ▼
              ┌─────────────────────────────┐
              │ DynamicCapRateResult         │
              │   recommended_pct · used_pct  │
              │   source · band · base_pct    │
              │   evidence · adjustments      │
              │   confidence · rationale      │
              │   override                    │
              └─────────────────────────────┘
```

## Module layout

```
lib/underwriting/cap-rate-engine/
├── index.ts                       # runDynamicCapRate(ctx) entry point
├── types.ts                       # all interfaces · single source of truth
├── evidence/
│   ├── index.ts                   # buildMarketEvidence
│   └── seeded-comps.ts            # MVP SEEDED_HOTEL_COMPS (Madrid + BCN + MRB)
├── adjustments/
│   └── index.ts                   # buildAdjustments + 8 policy functions
├── confidence/
│   └── index.ts                   # buildConfidence + 4 sub-scores
├── rationale/
│   └── index.ts                   # buildRationale + narrative builder
└── overrides/
    └── index.ts                   # buildOverride · audit trail
```

## Scenario-aware

The cap-rate engine is **NOT a single static number**. The scenario_id
flows into the adjustment policy:

| Scenario | Delta vs base |
|---|---:|
| `downside` / `conservative` | +0.30 pp |
| `base` | 0 |
| `upside` / `aggressive` | −0.20 pp |
| `stress` | +0.60 pp |

Operator changes scenario → cap rate moves → exit valuation re-prices
→ IRR/MOIC re-compute. The Section 6 stabilised-yield ramp + Section
8 Exit metrics all react reactively.

## Entry vs Exit

- **Entry** runs without the `side` adjustment (delta = 0)
- **Exit** adds `+0.20 pp` terminal-yield hedge (Spanish core hotel
  convention · exit yields trade wider than entry for terminal market
  regime uncertainty)

Both share the same scenario, evidence, override config — diverge
only on the `side` flag in the context.

## Adjustment policy (default calibration)

Calibrated to Madrid Centro 4* / 200-key benchmark. Block 7 will
expose these as operator-tunable in a Cap Rate Policy Editor.

| Adjustment | Trigger | Delta |
|---|---|---:|
| Category 5* Luxury | `asset.category === "5star"` | −0.25 pp |
| Category 4* Upscale | `asset.category === "4star"` | 0 |
| Category 3* Midscale | `asset.category === "3star"` | +0.25 pp |
| Size ≥200 keys | institutional scale | −0.10 pp |
| Size 100-199 keys | mid-tier | 0 |
| Size <100 keys | sub-scale | +0.20 pp |
| State new | turnkey · no CAPEX risk | −0.10 pp |
| State renovated | non-CAPEX | 0 |
| State needs_work | reposition · CAPEX-heavy | +0.50 pp |
| Operator branded chain | default · brand premium | −0.10 pp |
| Macro · per 100 bps Euribor above LT mean | rates regime | +0.20 pp |
| Liquidity ≥6 deals/12m | deep market | −0.05 pp |
| Liquidity 3-5 deals/12m | moderate | 0 |
| Liquidity <3 deals/12m | thin · exit risk | +0.20 pp |
| Scenario downside | conservative overlay | +0.30 pp |
| Scenario base | neutral | 0 |
| Scenario upside | aggressive | −0.20 pp |
| Scenario stress | tail risk | +0.60 pp |
| Side exit | terminal hedge | +0.20 pp |

## Confidence weighting (default)

| Sub-score | Weight | What it measures |
|---|---:|---|
| Sufficiency | 30% | # of comparables surviving filtering |
| Volatility | 25% | IQR spread / median — tight bands = high confidence |
| Staleness | 20% | Age of most recent comparable (months) |
| Coverage | 25% | Share of comps matching exact submarket + category |

## Filtering rules

1. Drop comps with `transaction_date` older than 36 months
2. Drop comps with category gap > 1 star (3* asset → drop 5* comps)
3. Drop comps with size ratio > 5× (80-key asset → drop 500-key comps)
4. Scope: prefer submarket match · if <3 broaden to market · if <3 broaden to national
5. Every exclusion captured in `comparables_excluded[]` with the rule
   that rejected it · audit-grade traceability

## Evidence today vs Block 7 (Intelligence Layer)

MVP ships with `SEEDED_HOTEL_COMPS` (12 Madrid/Barcelona/Marbella
hotel transactions · curated · plausible · not confidential). Block 7
swaps this for a live Supabase query against the Intelligence Layer's
`hotel_transactions` table:

```ts
// Block 7 swap (sketch)
const comps = await supabase
  .from("hotel_transactions")
  .select("*")
  .gte("transaction_date", asOfDate.minus({ months: 36 }))
  .eq("country", asset.country);
```

The engine signature stays the same · only the data source swaps.

## Engine output · base scenario (Madrid Centro · 256 keys · renovated · base)

| Metric | Value |
|---|---:|
| Entry cap rate (used) | **6.45 %** |
| Exit cap rate (used) | **6.65 %** |
| Band (entry) | 6.15 % — 6.75 % |
| Confidence | **80 / 100 (high)** |
| Comps in scope | 5 |
| Comps excluded | 7 (4 stale · 3 outside submarket) |
| Median of in-scope comps | 6.20 % |
| IQR | 6.10 % — 6.30 % (0.20 pp spread) |

Engine recommendation flows downstream: Section 6 stabilised-yield
ramp · Section 7 LTV · Section 8 exit value · IRR · MOIC all re-price
reactively.

## Exit integration

`engine/exit.ts` consumes `cap_rate.exit.used_pct` (whether dynamic or
override). The exit IRR + MOIC computation closes the loop:

  Market intelligence → cap rate → valuation → IRR → investment decision

Operator sees the same recommended cap rate in:
- Section 6 · Investment Memorandum (Cap-Rate Rationale block)
- Section 8 · Exit Strategy KPIs (exit_cap_rate_pct hero)
- Reconciliation panel · band + confidence surfaced

## Override discipline

Override is ALWAYS available · institutional operators expect it. The
audit captures:
- `manual_value_pct` (the pinned figure)
- `operator_rationale` (required free text justification)
- `operator_email` (identity for committee record)
- `applied_at` (ISO timestamp)
- `delta_vs_recommended_pct` (numeric Δ so reviewers see both)

Section 6 will (Block 7) render an "Override engaged" badge with the
delta and rationale so the IC has both numbers side-by-side.

## What's deliberately NOT in Block 6

- Cap Rate Policy Editor (admin UI · Block 7)
- Live Supabase intelligence query (Block 7)
- Sensitivity matrix (recommended vs scenario × evidence subset · Block 8)
- Promote-waterfall integration (Block 9)
- Comparable-transaction map (visual evidence map · Block 9)
