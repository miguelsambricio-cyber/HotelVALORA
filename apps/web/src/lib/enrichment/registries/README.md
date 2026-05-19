# Canonical Registries

Static lookup tables that drive normalization, brand/operator resolution, locality mapping, and type/segment derivation during hotel enrichment.

**Workstream:** `feature/hotel-enrichment-pipeline`.
**Phase:** 1 — data + pure helper functions only. No I/O, no side effects, no DB calls.
**Consumed by:** future ingestion code under `apps/web/src/lib/enrichment/` (Phase 2+).

---

## Files

| File | What it owns |
|---|---|
| `brands.ts` | Brand → brand_family → chain_scale mapping. Madrid-focused initial set; extensible. |
| `amenities.ts` | Multilingual (ES/EN) raw-string → canonical 14-key amenity bitmap. |
| `madrid-municipios.ts` | Madrid metro municipios → `city_normalized` alias table. |
| `hotel-types.ts` | `accommodation_type_name` → `hotel_type` enum; segment derivation from star_rating + chain_scale. |
| `index.ts` | Barrel re-export. |

## Conventions

- **Pure data + pure functions.** No async, no fetches, no DB calls.
- **Versioned implicitly via `git`.** When the registry grows, update the file in place; never branch into `brands-v2.ts`.
- **Slug-keyed.** Canonical lookups use lower-kebab slugs (e.g., `nh-collection`, `melia`) for stability across rebrands.
- **Multilingual where the source data is multilingual.** Amenity strings come from Booking in both ES and EN — both are mapped.
- **Extensible.** Phase 1 covers the ~85% case for Madrid; gaps populate the `hotel_review_queue` for curator action.

## Confidence implications

These registries drive the *deterministic* portion of confidence scoring (main arch doc §3):

- A brand-name match against this registry yields `tier_weight × 1.0 × 1.0 = brand_family at 0.80` (deterministic derivation, no source authority decay).
- An amenity raw-string match yields `0.85` confidence for that amenity key.
- A municipio match yields `0.95` for `city_normalized` (deterministic).

## Not in scope

- No I/O. No async. No imports from `@/lib/api` or `@/lib/supabase`.
- No state. These modules export only constants and pure functions.
- No coupling to the Booking RapidAPI client (that lives under `apps/web/src/lib/enrichment/providers/booking-rapidapi/` in Phase 2).
