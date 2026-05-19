# Confidence Module

Institutional field-level confidence calculator + conflict resolver for the canonical hotel pipeline.

**Strategic role:** confidence scoring is one of three pillars of HotelVALORA's hotel intelligence moat. A canonical row without confidence metadata is just a guess; with it, every consuming surface (Library, Reports, CompSet, Match Engine) can apply tier-correct rendering and gate-correct premium UX.

## Formula (architecture doc §3.1)

```
confidence = clamp(0, 1,
                   tier_weight × freshness_decay × validation_multiplier
                 + agreement_bonus)
```

| Term | Source | Range |
|---|---|---|
| `tier_weight` | `tier-registry.ts` (with `fieldAuthorityOverride` for per-field strong/weak sources) | [0, 1] |
| `freshness_decay` | linear 1.0 → 0.5 over 1y, → 0.4 by 2y | [0.4, 1] |
| `validation_multiplier` | 1.0 on pass, 0.8 on fail | {0.8, 1.0} |
| `agreement_bonus` | +0.10 per matching independent source, cap +0.25 | [0, 0.25] |

**Manual override** pins confidence to 1.0 and freezes the field — handled by the conflict resolver before the formula runs.

## Conflict resolution (architecture doc §4.4)

When a new write disagrees with the canonical value, the resolver classifies the disagreement:

| Case | Condition | Action |
|---|---|---|
| `ADOPT` | existing is null | Update canonical with candidate (unconditional) |
| `PRESERVE` | existing has manual_override pin | Never supersede; record provenance only |
| `REINFORCE` | values are deeply equal | Bump existing confidence to max(existing, candidate); no value change |
| `AUTO_SUPERSEDE` | `new_conf ≥ existing_conf + 0.10` | Update canonical |
| `ABSORB` | `new_conf ≤ existing_conf − 0.10` | Record provenance only; canonical unchanged |
| `CONFLICT` | within ±0.10 band | Record provenance; route to review queue |

## File layout

```
confidence/
  tier-registry.ts       SOURCE_TIERS · getTier · fieldAuthorityOverride
  calculator.ts          freshnessDecay · validationMultiplier ·
                         agreementBonus · computeFieldConfidence
  conflict-resolver.ts   resolveFieldConflict · computeQualityTier
  index.ts               barrel
  README.md              this file
```

## Quality tiers (architecture doc §6.3)

`computeQualityTier()` returns `gold | silver | bronze | quarantined` from T0/T1/T2 percentages plus corroboration counts. Consumed by the writer layer to populate `hotel_canonical.data_quality_tier`.

## What this module does NOT do

- Does not read or write to the database. Persistence is the writer's job.
- Does not validate field values. Validation lives in the provider's parser (e.g., `booking-rapidapi/parse.ts`); the calculator receives a `ValidationOutcome` and applies the 0.8 / 1.0 multiplier.
- Does not classify sources beyond the tier registry. The tier registry is the single source of truth — to add a new source, extend `SOURCE_TIERS` in one place.

## Determinism

All functions are pure. `freshnessDecay` accepts an explicit `now` parameter for deterministic testing and replay. The same inputs produce the same confidence to the third decimal place.
