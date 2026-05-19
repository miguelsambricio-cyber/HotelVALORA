/**
 * Google Places provider — barrel.
 *
 * Phase 1: dry-run + recorded-fixture only. Live mode (Phase 4)
 * requires GOOGLE_PLACES_API_KEY env var.
 *
 * Field authority (per architecture doc §2.2):
 *   - lat, lng           — Google is Tier-C with geo boost (0.90)
 *   - phone, postal_code — Tier-C with contact boost (0.85)
 *   - google_place_id    — self-authoritative (1.00)
 *   - address_line1, neighborhood, website_url — Tier-C base (0.70)
 *   - rating, user_rating_count — stored alongside Booking's, not fused
 *
 * Cost discipline: Place Details ≈ $0.017/call. Phase E target uses
 * Google ONLY for hotels missing critical TIER-2 fields after Booking.
 */

export * from "./types";
export * from "./client";
export * from "./map-to-canonical";

export const GOOGLE_PLACES_PROVIDER_VERSION = "1.0.0-dry-run";
