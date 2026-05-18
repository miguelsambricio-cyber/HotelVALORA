/**
 * Scenario persistence contract.
 *
 * Hierarchy (operator decision · 2026-05-18):
 *
 *   Asset
 *     └── Scenario (mutable working state)
 *           └── Snapshot[] (immutable historical records)
 *                 ├── inputs_snapshot       · frozen UnderwritingInputs
 *                 ├── computed_snapshot     · frozen UnderwritingComputed
 *                 ├── engine_version        · which engine produced this
 *                 ├── schema_version        · inputs schema version
 *                 ├── created_at            · ISO timestamp
 *                 ├── created_by_email      · operator who saved
 *                 └── label?                · optional human label
 *
 * Snapshots are NEVER silently recomputed. Stakeholders looking back
 * at a December investment committee snapshot see EXACTLY the numbers
 * that were committed that day, even if the engine has shipped fixes
 * since. The system offers an explicit "Recompute with current engine"
 * action on a snapshot · that produces a NEW snapshot with the new
 * computed values, the original is preserved.
 *
 * Block 2: types only. Block 8 wires Supabase persistence
 * (`underwriting_scenarios` + `underwriting_snapshots` tables).
 */

import type { UnderwritingInputs, UnderwritingComputed } from "./types";
import type { VersionTag } from "./versioning";

/** Mutable working scenario · operator can edit until saved. */
export interface Scenario {
  id: string;
  asset_id: string;
  name: string;
  description?: string;
  /** Parent scenario for "what-if" derivations · null when standalone. */
  parent_scenario_id?: string;
  /** Current live inputs · editable. */
  inputs: UnderwritingInputs;
  /** Engine output recomputed on inputs change (lazy / debounced). */
  computed: UnderwritingComputed;
  /** Snapshot history · most-recent first. */
  snapshots: ScenarioSnapshot[];
  /** Audit · who last edited the working scenario. */
  updated_at: string;
  updated_by_email?: string;
  created_at: string;
  created_by_email?: string;
}

/** Immutable point-in-time record of a scenario · reproducible. */
export interface ScenarioSnapshot extends VersionTag {
  id: string;
  scenario_id: string;
  created_at: string;
  created_by_email?: string;
  label?: string;
  /** Deep-frozen inputs at save time. */
  inputs_snapshot: UnderwritingInputs;
  /** Deep-frozen engine output at save time. */
  computed_snapshot: UnderwritingComputed;
  /** Free-form note (e.g. "Investment committee 2026-Q4"). */
  notes?: string;
}

/** Build a snapshot from the current scenario state · immutable contract. */
export function freezeSnapshot(
  scenario: Scenario,
  versionTag: VersionTag,
  meta: { id: string; created_by_email?: string; label?: string; notes?: string },
): ScenarioSnapshot {
  return Object.freeze({
    id: meta.id,
    scenario_id: scenario.id,
    created_at: new Date().toISOString(),
    created_by_email: meta.created_by_email,
    label: meta.label,
    notes: meta.notes,
    schema_version: versionTag.schema_version,
    engine_version: versionTag.engine_version,
    inputs_snapshot: deepFreeze(structuredClone(scenario.inputs)),
    computed_snapshot: deepFreeze(structuredClone(scenario.computed)),
  });
}

/** Recursively Object.freeze · used for snapshot inputs/computed. */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj as object)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

// ─── Legacy 3-band discriminator (pre-Block 2) ────────────────────────
//
// Used by the financials report (RevPAR scenario picker · cap rate
// scenario · market-scenarios profile). Kept as the canonical
// downside/base/upside band for the simpler report-level toggles.
// The new Scenario / ScenarioSnapshot above is the underwriting-OS
// persistence contract · these two coexist intentionally.

export type UnderwritingScenario = "downside" | "base" | "upside";

export const SCENARIO_LABELS: Record<UnderwritingScenario, string> = {
  downside: "DOWN",
  base: "BASE",
  upside: "UP",
};

export const SCENARIO_OPTIONS: ReadonlyArray<{ id: UnderwritingScenario; label: string }> = [
  { id: "downside", label: SCENARIO_LABELS.downside },
  { id: "base", label: SCENARIO_LABELS.base },
  { id: "upside", label: SCENARIO_LABELS.upside },
];
