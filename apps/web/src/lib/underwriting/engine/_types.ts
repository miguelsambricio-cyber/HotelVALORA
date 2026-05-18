/**
 * Engine module contract.
 *
 * Every calculation module implements EngineModule<I, O>. The orchestrator
 * (engine/index.ts) walks ENGINE_DAG in topological order, materialises
 * each module's input from prior outputs, and stitches results back into
 * the global UnderwritingComputed shape.
 *
 * Module isolation rules (locked · 2026-05-18):
 *   1. A module reads ONLY from `inputs` + declared dependencies.
 *   2. A module writes EXACTLY ONE slice of UnderwritingComputed.
 *   3. A module never reads from its own output (no recursion).
 *   4. Side effects forbidden · pure function · same in → same out.
 *   5. NaN / Infinity is a bug · modules must defend at boundaries.
 *
 * Determinism requirement: same inputs + same engine_version MUST
 * produce byte-identical outputs · this is what makes snapshots
 * reproducible across runs and across machines.
 */

import type { UnderwritingInputs, UnderwritingComputed } from "../types";

/** Identifier of a slice of the UnderwritingComputed root object. */
export type ComputedKey = keyof UnderwritingComputed;

/** Context passed to every module · read-only inputs + prior results. */
export interface EngineContext {
  inputs: Readonly<UnderwritingInputs>;
  /** Outputs of upstream modules · keyed by ComputedKey. */
  prior: Partial<UnderwritingComputed>;
}

export interface EngineModule<K extends ComputedKey = ComputedKey> {
  /** Stable key · matches the slice of UnderwritingComputed it produces. */
  key: K;
  /** Modules whose output this module reads (declared, enforced by DAG). */
  dependsOn: ComputedKey[];
  /** Pure function · same inputs + same prior → same output. */
  compute(ctx: EngineContext): UnderwritingComputed[K];
}
