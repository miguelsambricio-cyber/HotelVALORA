/**
 * Confidence module — barrel.
 *
 * Pure functions. No I/O. Consumed by the orchestrator + writer layer.
 *
 * See ./README.md for usage and architectural notes.
 */

export * from "./tier-registry";
export * from "./calculator";
export * from "./conflict-resolver";

export const CONFIDENCE_MODULE_VERSION = "1.0.0";
