/**
 * Dedup module — barrel.
 *
 * Pure functions. No I/O. Consumed by the orchestrator.
 *
 * See ./README.md for usage and architectural notes.
 */

export * from "./string-similarity";
export * from "./scoring";
export * from "./engine";

export const DEDUP_MODULE_VERSION = "1.0.0";
