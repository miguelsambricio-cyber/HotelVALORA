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

export const SCHEMA_VERSION = "1.0.0" as const;
export const ENGINE_VERSION = "0.1.0-scaffold" as const;

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
