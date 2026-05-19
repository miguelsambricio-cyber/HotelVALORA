/**
 * Writer module — barrel.
 *
 * Two writer implementations against a shared `IntendedWrite` plan:
 *   - `DryRunWriter`  — captures writes for inspection (Phase 1).
 *   - `SupabaseWriter` — executes against Supabase (Phase A+).
 *
 * Clean interface-swap invariant: the orchestrator core never imports
 * anything from this module. Writer wiring lives in the worker layer.
 *
 * See ./README.md.
 */

export * from "./types";
export * from "./intended-writes";
export * from "./dry-run-writer";
export * from "./supabase-canonical-store";
export * from "./supabase-writer";

export const WRITER_MODULE_VERSION = "1.0.0";
