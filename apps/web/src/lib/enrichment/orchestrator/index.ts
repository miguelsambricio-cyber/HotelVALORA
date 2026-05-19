/**
 * Orchestrator module — barrel.
 *
 * Wires the provider client, dedup engine, confidence calculator, and
 * canonical store into a single executable pipeline. Phase 1 dry-run.
 *
 * See ./README.md.
 */

export * from "./types";
export * from "./retry-policy";
export * from "./in-memory-store";
export * from "./runner";
export * from "./fallback-dispatcher";

export const ORCHESTRATOR_MODULE_VERSION = "1.0.0-dry-run";
