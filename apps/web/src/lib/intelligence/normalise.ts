import "server-only";
import { createHash } from "node:crypto";
import type { NormalisedNewsItem, RawNewsItem } from "./types";
import { categorise, extractTags } from "./categorise";
import { classifyRelevance } from "./relevance";

/**
 * URL canonicalisation per `docs/intelligence/news-data-schema.md` §12.
 *
 *   1. lowercase scheme + host
 *   2. strip tracking params (utm_*, gclid, fbclid, ref, _hsenc, _hsmi, mc_cid, mc_eid)
 *   3. strip trailing slash
 *   4. strip URL fragment
 */
const TRACKING_PARAM_RE = /^(utm_|_hs[a-z]+|mc_)/i;
const TRACKING_PARAMS = new Set([
  "gclid",
  "fbclid",
  "ref",
  "ref_src",
  "yclid",
  "msclkid",
  "icid",
  "cmpid",
]);

export function canonicaliseUrl(input: string): string {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return input.trim();
  }
  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase();
  u.hash = "";
  const drop: string[] = [];
  u.searchParams.forEach((_, key) => {
    if (TRACKING_PARAM_RE.test(key) || TRACKING_PARAMS.has(key.toLowerCase())) {
      drop.push(key);
    }
  });
  drop.forEach((k) => u.searchParams.delete(k));
  let out = u.toString();
  if (out.endsWith("/") && u.pathname !== "/") out = out.slice(0, -1);
  return out;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function urlHash(canonical: string): string {
  return sha256Hex(canonical);
}

export function contentHash(title: string, summary?: string): string {
  return sha256Hex(`${title.trim()}\n${(summary ?? "").trim()}`);
}

/**
 * Best-effort language inference when the feed didn't tag it. ES heuristic
 * watches for the most common Spanish stopwords + Spanish-only chars. EN is
 * the default fallback — wider corpus tolerates the false-positives.
 */
const ES_TOKENS = /\b(que|los|las|del|una|por|para|con|este|esta|según|también|así|años?|hotel(?:es)?|fondo|inversión|compra|venta)\b/i;
function inferLanguage(title: string, body?: string): string {
  const sample = `${title} ${body ?? ""}`;
  if (/[ñáéíóúü¿¡]/i.test(sample)) return "es";
  if (ES_TOKENS.test(sample)) return "es";
  return "en";
}

export function normalise(raw: RawNewsItem): NormalisedNewsItem {
  const canonical = canonicaliseUrl(raw.url);
  const language = raw.language ?? inferLanguage(raw.title, raw.body ?? raw.summary);
  const category = categorise(raw.title, raw.summary ?? raw.body ?? "", language);
  const tags = extractTags(raw.title, raw.summary ?? raw.body ?? "");
  const relevance = classifyRelevance(raw.title, raw.body, raw.summary);
  return {
    ...raw,
    language,
    canonical_url: canonical,
    url_hash: urlHash(canonical),
    content_hash: contentHash(raw.title, raw.summary),
    category,
    tags,
    relevance_tier: relevance.tier,
    relevance_signal: relevance.signal,
  };
}
