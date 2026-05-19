/**
 * Schema + engine versioning for the underwriting OS.
 *
 * Why two version numbers:
 *   · SCHEMA_VERSION  · breaks when UnderwritingInputs shape changes.
 *                       Snapshots created with older schemas need
 *                       migration before re-evaluation.
 *   · ENGINE_VERSION  · breaks when compute logic changes (a fix to
 *                       DTA limitation logic, a new financing tranche
 *                       type, etc.). Historic snapshots are NOT
 *                       silently recomputed · operator sees both
 *                       "as-of" and "live" values when comparing.
 *
 * Discipline: any structural change to UnderwritingInputs / Computed /
 * ScenarioMetadata MUST bump SCHEMA_VERSION. Any change to engine math
 * MUST bump ENGINE_VERSION. CI guard (TODO Block 3) fails commits that
 * change those shapes without a version bump.
 */

export const SCHEMA_VERSION = "1.1.0" as const;
export const ENGINE_VERSION = "0.2.0" as const;

/**
 * Version history · most recent first.
 *
 * 0.2.0 (2026-05-19) · Project + Equity IRR layer separation.
 *   · Project IRR semantics changed: NOW unlevered · pre-tax (EBITDA + gross exit only).
 *     Previously subtracted cash tax + used net exit price (effectively post-tax + net of fees).
 *   · Equity IRR unchanged in math · clarified as levered · post-tax.
 *   · ExitMetrics gains future slots: project_irr_posttax_pct, equity_irr_gross_pct,
 *     lp_irr_pct, gp_irr_pct (null in MVP · populated by Block 9 waterfall + Block 10).
 *   · Schema bumped to 1.1.0 because ExitMetrics shape now has new optional fields.
 *   · Snapshots created with engine 0.1.0 will compute different Project IRR on recompute.
 *
 * 0.1.0-scaffold (2026-05-15) · initial engine.
 */

/** Bumps · semver-style · MAJOR breaks reproducibility, MINOR adds fields, PATCH fixes. */
export type SemverString = `${number}.${number}.${number}${string}`;

export interface VersionTag {
  schema_version: SemverString;
  engine_version: SemverString;
}

export function currentVersionTag(): VersionTag {
  return {
    schema_version: SCHEMA_VERSION,
    engine_version: ENGINE_VERSION,
  };
}

/**
 * Is a snapshot compatible with the current engine for live recompute?
 * Same MAJOR + MINOR · safe. PATCH delta · safe. Otherwise must migrate.
 */
export function isCompatibleForRecompute(snapshotEngine: SemverString): boolean {
  const [maj1, min1] = snapshotEngine.split(".").map((x) => parseInt(x, 10));
  const [maj2, min2] = ENGINE_VERSION.split(".").map((x) => parseInt(x, 10));
  return maj1 === maj2 && min1 === min2;
}
