/**
 * Booking RapidAPI provider — barrel.
 *
 * Phase 1 surface: types, config, client (dry-run / fixture modes),
 * endpoints, parse, map-to-canonical, dry-run orchestrator.
 * Live HTTP path is stubbed and throws — Phase 3 work item.
 */

export * from "./types";
export * from "./config";
export * from "./client";
export * from "./endpoints";
export * from "./parse";
export * from "./map-to-canonical";
export * from "./dry-run";

export const BOOKING_RAPIDAPI_PROVIDER_VERSION = "1.0.0-dry-run";
