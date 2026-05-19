/**
 * Wikidata provider — barrel.
 *
 * Phase 1: dry-run. Live mode (Phase 4) honors Wikidata's 1 req/s
 * limit and identifies HotelVALORA via the User-Agent header.
 *
 * Field authority:
 *   - wikidata_qid           self-authoritative (1.00)
 *   - year_opened (P571)     Tier-F boost (0.65)
 *   - ownership_structure    Tier-F base (0.50)
 *
 * Wikidata is sparse for hotels — typical Madrid coverage will be
 * < 10%. But for the hotels it covers, it's high-signal: institutional
 * year_opened and ownership chains.
 */

export * from "./client";
export * from "./map-to-canonical";

export const WIKIDATA_PROVIDER_VERSION = "1.0.0-dry-run";
