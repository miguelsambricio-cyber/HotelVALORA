# Booking Expansion + CompSet Substitution · spec (PLANNED)

**Status**: 🟡 planned · NOT implemented
**Owner**: operator-driven · institutional integrity priority
**Filed**: 2026-05-26
**Prerequisites**:
1. CoStar enrichment Phase D complete for the 224 baseline hotels (in progress · PASO 3)
2. Facility-aware P&L rule shipped (PASO 4 · pending)

---

## Purpose

Widen the universe of hotels the user can select from in `/compset` by including hotels that exist on **Booking** but are not in the **CoStar** market dataset · while **preserving the institutional integrity** of the report's numbers (CoStar is the analytical source of truth).

The user can browse and pick from a richer set; the compset always shows numbers backed by real CoStar data, even when the user's selected competitors include hotels that only Booking knows about.

---

## Mechanism

### 1. Expand the selectable universe (RapidAPI · unlimited)

Pull hotels from Booking in the same submarkets CoStar already covers · index them in `hotel_canonical` with `primary_source='booking_rapidapi'` and `data_quality_tier='bronze'` until a CoStar match is found.

These hotels carry the same identity columns (booking_hotel_id, google_place_id, lat/lng, postal_code, facilities, photos) but lack the CoStar-derived columns (`costar_property_id`, market_yield references, etc.).

### 2. Minimum-4-with-data rule

A CompSet renders only when **≥ 4 competitors have CoStar data** (ADR · Occupancy · RevPAR · market_yield). If the user's selection produces fewer than 4, the engine **does NOT fabricate** numbers for the missing competitors.

### 3. Substitution (not fabrication)

Instead of synthesising numbers for a Booking-only competitor, **swap the competitor for a real CoStar hotel** that's:

- in the same submarket (or one tier up · institutional preference)
- has equivalent or richer facilities (matching the `restaurants_count`, `meeting_rooms_count`, amenity bitmap from PASO 4 rule)
- geographically near the original selection (proximity score · haversine + postal match)
- **tie-breaker**: highest ADR in Booking among the candidates (the "best comparable" by performance)

The substitute carries its REAL CoStar data into the compset table. The user's originally-chosen Booking-only hotel still appears in the gallery / selection panel but is flagged.

### 4. Transparency (mandatory · institutional integrity)

Every substituted entry MUST be marked, two surfaces:

- **In the compset table**: discreet asterisk `*` next to each numeric cell of the substituted row + an expandable `Estimado por comparable` row revealing (a) the original Booking-only hotel selected by the user, (b) the CoStar comparable chosen as substitute, (c) the matching criteria that closed the gap.
- **In the compset gallery**: subtle white asterisk on the substituted competitor's photo · click reveals the same explanation.

No silent substitutions. Operator and end-user always see when a comparable replaced a direct match.

---

## Why this matters

CoStar coverage is finite. Booking covers most hotels worldwide but its numbers (ADR / Occupancy / RevPAR) are NOT institutional analytical inputs — they're listing data. A report that mixes the two without flagging risks misleading an investor.

The substitution rule keeps the user's freedom to compose any compset they want while guaranteeing the analytical numbers come from CoStar · explicitly · always · with provenance visible.

---

## Open questions (resolve when implementing)

1. **Substitution scope**: same submarket only, or allow one-tier-up? Spec leans toward same-submarket-first, then expand if no match.
2. **Facility match tolerance**: exact match (4 restaurants ↔ 4 restaurants) vs. range (3-5)?
3. **Asterisk visual treatment in print/PDF**: today the asterisk lives only in interactive surfaces; print must show it too.
4. **What if zero substitute is found?** Soft-fail with a banner "Competitor X has no CoStar comparable available — please reselect" rather than rendering with <4.
5. **`restaurants_count` ranking weight in the substitution scoring** · F&B-heavy hotels may need a tighter match.

---

## Out of scope of this spec

- Detection of the Booking-only universe boundary (where to stop pulling)
- UI flow for the user to "see" Booking hotels they didn't know existed
- Backfill cost projections beyond the current PASO 2 estimate (lineal scaling rule already documented)
- Rebrand policy (separate spec · 3-layer infrastructure already shipped)

---

## Dependencies

| Dependency | Status |
|---|---|
| CoStar enrichment of 224 baseline hotels (PASO 3) | ⏳ in progress |
| `restaurants_count` column on `hotel_canonical` | ✅ shipped (migration 0034) |
| Facility-aware P&L rule (PASO 4) | ⏳ pending |
| `hotel_name_alias` + `hotel_canonical_history` (rebrand policy) | ✅ shipped (migration 0032+0033) |
| Same-building geo detector (Capa A) | ✅ shipped (`apps/web/src/lib/enrichment/dedup/same-building-detector.ts`) |

When all the above are green, this spec moves from `planned` to `ready-to-implement`.
