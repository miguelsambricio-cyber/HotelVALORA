/**
 * String similarity primitives (v1).
 *
 * Pure functions, no I/O, no Node-only deps. Drives:
 *   - Block-key generation (soundex for fuzzy locality).
 *   - Composite duplicate-score component `name_fuzzy` / `name_exact`.
 *   - Brand alias matching (registries already inlined; this is the
 *     general-purpose layer for ad-hoc string compare).
 *
 * Aligned with the institutional dedup convention used in
 * `apps/api/app/services/dedup_service.py` so behaviour stays
 * isomorphic across the FastAPI and Next.js layers.
 */

// ───────────────────────────────────────────────────────────────────────────
// Normalisation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lowercase + strip diacritics + collapse non-alphanumerics to single spaces.
 * Mirrors `services/data_pipeline/pipeline/cleaning/multilingual.py` behaviour
 * for matching keys (`remove_stopwords=False` variant).
 */
export function normalizeForMatching(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Same as above but additionally strips common hospitality stopwords. */
const STOPWORDS = new Set([
  "hotel", "hotels", "hoteles", "the", "el", "la", "los", "las", "de", "del",
  "by", "and", "y", "&", "spa", "resort", "apartments", "aparthotel",
  "boutique", "luxury", "collection",
]);

export function normalizeForBlocking(input: string): string {
  return normalizeForMatching(input)
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t))
    .join(" ");
}

// ───────────────────────────────────────────────────────────────────────────
// Soundex (American, 4-char output)
// Used by block_key to group phonetically-similar names without N×N.
// ───────────────────────────────────────────────────────────────────────────

const SOUNDEX_MAP: Record<string, string> = {
  b: "1", f: "1", p: "1", v: "1",
  c: "2", g: "2", j: "2", k: "2", q: "2", s: "2", x: "2", z: "2",
  d: "3", t: "3",
  l: "4",
  m: "5", n: "5",
  r: "6",
};

export function soundex(input: string): string {
  const cleaned = normalizeForMatching(input).replace(/\s+/g, "");
  if (!cleaned) return "Z000";
  const first = cleaned[0].toUpperCase();
  let result = first;
  let prevCode = SOUNDEX_MAP[cleaned[0]] ?? "";
  for (let i = 1; i < cleaned.length && result.length < 4; i++) {
    const code = SOUNDEX_MAP[cleaned[i]];
    if (!code) {
      // h, w, y, vowels → skip but don't reset prevCode (so consecutive
      // consonants of same group still collapse)
      continue;
    }
    if (code !== prevCode) {
      result += code;
    }
    prevCode = code;
  }
  return (result + "000").slice(0, 4);
}

// ───────────────────────────────────────────────────────────────────────────
// Jaro / Jaro-Winkler similarity ∈ [0, 1]
// Classical implementation. Order-insensitive matching window.
// ───────────────────────────────────────────────────────────────────────────

function jaroSimilarityInternal(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches: boolean[] = new Array(s1.length).fill(false);
  const s2Matches: boolean[] = new Array(s2.length).fill(false);
  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0.0;
  // Transpositions
  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  transpositions /= 2;
  return (
    (matches / s1.length + matches / s2.length + (matches - transpositions) / matches) / 3
  );
}

export function jaroWinklerSimilarity(
  a: string,
  b: string,
  prefixScale: number = 0.1,
  maxPrefix: number = 4,
): number {
  const s1 = normalizeForMatching(a);
  const s2 = normalizeForMatching(b);
  const jaro = jaroSimilarityInternal(s1, s2);
  if (jaro < 0.7) return jaro; // standard Winkler boost gate
  let prefix = 0;
  for (let i = 0; i < Math.min(maxPrefix, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * prefixScale * (1 - jaro);
}

// Convenience wrapper
export function jaroSimilarity(a: string, b: string): number {
  return jaroSimilarityInternal(normalizeForMatching(a), normalizeForMatching(b));
}
