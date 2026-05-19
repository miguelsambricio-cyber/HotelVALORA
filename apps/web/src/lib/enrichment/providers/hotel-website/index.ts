/**
 * Hotel-website provider — barrel.
 *
 * Phase 1: dry-run + recorded-fixture only. Live HEAD probe (Phase 4)
 * requires per-domain authorisation list AND robots.txt compliance.
 *
 * Strictly controlled scraping policy:
 *   - HEAD-only probes by default.
 *   - robots.txt checked before every fetch.
 *   - User-Agent identifies HotelVALORA + contact email.
 *   - 4–8s randomized delay above any Crawl-delay directive.
 *   - Per-domain circuit breaker on failure.
 *   - HotelVALORA does NOT behave like an aggressive scraper.
 */

export * from "./robots";
export * from "./client";
export * from "./map-to-canonical";

export const HOTEL_WEBSITE_PROVIDER_VERSION = "1.0.0-dry-run";
