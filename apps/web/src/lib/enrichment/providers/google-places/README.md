# Google Places Provider (Phase 1 dry-run)

Tier-C source. Used as **first fallback** after Booking for geo correction, contact data, and `google_place_id` cross-linking.

## When this provider is invoked

The orchestrator's fallback dispatcher emits a Google Places job when one of these is missing from canonical AND the row is at `fallback_required` outcome:

- `lat`, `lng` (Google geo is excellent; boost to 0.90)
- `phone`, `postal_code` (contact boost to 0.85)
- `address_line1`, `neighborhood`
- `google_place_id` (self-authoritative cross-link)

If those fields are already populated at conf ≥ 0.80 from Booking, no Google Places call is made.

## Cost discipline

- Place Details ≈ $0.017/call. Field-mask reduces cost when fewer fields are requested — we always request a narrow mask.
- Monthly budget guard at `GOOGLE_PLACES_MONTHLY_BUDGET_USD`. Worker halts at cap.
- Phase 1 anchor: Madrid full fallback ≤ 1,800 hotels × ~1 call/hotel = $30 one-time + monthly refresh negligible.

## Live mode

Stubbed (throws). Phase 4 implementation:
1. Provision `GOOGLE_PLACES_API_KEY`.
2. Implement `GooglePlacesClient.fetchPlaceDetails` HTTP path with field-mask header.
3. Wire into worker layer behind rate limit (10 RPS conservative).

## Confidence calibration

Provided per-field by `mapGooglePlaceToFragment`. Aligned with architecture doc §2.2 field-by-field authority map.
