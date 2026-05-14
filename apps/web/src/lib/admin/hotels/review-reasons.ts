/**
 * Filter for `_meta.needs_review` reasons that are NOT material to
 * the operator's institutional review workload.
 *
 * Suppressed today:
 *   - missing_recommended:latitude
 *   - missing_recommended:longitude
 *
 * Rationale: the hotel detail page already exposes a "find on Google
 * Maps" fallback CTA for missing coordinates · operator resolves it
 * without a banner. Surfacing it as a review flag is noise.
 *
 * Anything else stays visible · chain_scale_unrecognised, segment_type_
 * unrecognised, year_unparseable, etc · are all real corrections the
 * operator should action.
 */

const NON_MATERIAL_PATTERNS: RegExp[] = [
  /^missing_recommended:(latitude|longitude)$/,
];

export function getMaterialReviewReasons(
  reasons: readonly string[] | null | undefined,
): string[] {
  if (!reasons) return [];
  return reasons.filter((r) => !NON_MATERIAL_PATTERNS.some((re) => re.test(r)));
}

export function hasMaterialReview(
  reasons: readonly string[] | null | undefined,
): boolean {
  return getMaterialReviewReasons(reasons).length > 0;
}
