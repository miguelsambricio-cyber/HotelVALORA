import "server-only";
import { createAnonServerSupabaseClient } from "@/lib/supabase/anon-server";

/**
 * F1 · single source of truth for the hotel corpus (select-corpus migration).
 *
 * `loadSearchCorpus()` reads the 226 canonical Madrid hotels from
 * `public.hotel_canonical` in a SLIM shape and caches them at module scope
 * (process lifetime · same pattern as `loadMarketSnapshotsCached`). This is
 * the ONE reader consumed by BOTH:
 *   - Tramo A · the landing search (`searchHotels`)
 *   - Tramo B · the compset (`fetchCompset` / explore pins / anchors)
 * so a slug can NEVER resolve in one place and not the other ("medio migrado").
 *
 * Server-only: uses the anon Supabase client (hotel_canonical / submarket /
 * operators have public-read RLS · migration 0025). NEVER import from a Client
 * Component — the client never touches Supabase per-keystroke (D1: the corpus
 * is fetched once on the server and filtered in the client).
 *
 * Slim shape = exactly the fields A (autocomplete) and B (map + Haversine +
 * cards) need. Per-hotel ADR/RevPAR/occupancy are intentionally absent — they
 * do not exist per hotel anywhere (see D2 + docs/underwriting/TRAMO5…).
 */

export interface CorpusHotel {
  /** hotel_canonical.slug · stable id used in ?ref / report resolver */
  slug: string;
  /** hotel_canonical.canonical_name */
  name: string;
  brand: string | null;
  /** operators.name (joined) */
  operator: string | null;
  /** hotel_canonical.star_rating */
  stars: number | null;
  /** submarket.name (joined) · drives the coverage badge later (Tramo C) */
  submarket: string | null;
  /** WGS84 · real coordinates for the compset map + Haversine */
  lat: number;
  lng: number;
}

interface RawHotelRow {
  slug: string | null;
  canonical_name: string | null;
  brand: string | null;
  star_rating: number | null;
  lat: number | null;
  lng: number | null;
  submarket_id: string | null;
  operator_id: string | null;
}

// Process-lifetime cache. `corpusCache` holds the resolved value; `inFlight`
// dedupes concurrent first-callers so we never issue the query twice.
let corpusCache: CorpusHotel[] | null = null;
let inFlight: Promise<CorpusHotel[]> | null = null;

async function fetchCorpus(): Promise<CorpusHotel[]> {
  const sb = createAnonServerSupabaseClient();

  const hres = await sb
    .from("hotel_canonical")
    .select(
      "slug,canonical_name,brand,star_rating,lat,lng,submarket_id,operator_id",
    );
  if (hres.error) {
    throw new Error(`loadSearchCorpus: hotel_canonical read failed: ${hres.error.message}`);
  }
  const rows = (hres.data ?? []) as unknown as RawHotelRow[];

  // Batch the two lookups (submarket + operator names) instead of per-row joins.
  const submarketIds = [...new Set(rows.map((r) => r.submarket_id).filter((x): x is string => !!x))];
  const operatorIds = [...new Set(rows.map((r) => r.operator_id).filter((x): x is string => !!x))];

  const lookup = async (
    table: "submarket" | "operators",
    ids: string[],
  ): Promise<Map<string, string>> => {
    if (ids.length === 0) return new Map();
    const res = await sb.from(table).select("id,name").in("id", ids);
    const data = (res.data ?? []) as unknown as Array<{ id: string; name: string | null }>;
    return new Map(data.map((d) => [d.id, d.name ?? ""]));
  };

  const [submarketMap, operatorMap] = await Promise.all([
    lookup("submarket", submarketIds),
    lookup("operators", operatorIds),
  ]);

  return rows
    // Defensive: a corpus hotel without slug/coords is unusable for routing or
    // the map — exclude it rather than ship a broken row. (All 226 have them.)
    .filter((r) => r.slug && r.lat != null && r.lng != null)
    .map((r) => ({
      slug: r.slug as string,
      name: r.canonical_name ?? "",
      brand: r.brand,
      operator: r.operator_id ? (operatorMap.get(r.operator_id) ?? null) : null,
      stars: r.star_rating,
      submarket: r.submarket_id ? (submarketMap.get(r.submarket_id) ?? null) : null,
      lat: r.lat as number,
      lng: r.lng as number,
    }));
}

/**
 * Load the full hotel corpus (slim). Cached at module scope: the first call
 * queries Supabase; every later call returns the SAME cached array reference
 * with no further query (verified by referential equality at the F1 checkpoint).
 */
export async function loadSearchCorpus(): Promise<CorpusHotel[]> {
  if (corpusCache !== null) return corpusCache;
  if (inFlight !== null) return inFlight;
  inFlight = fetchCorpus()
    .then((corpus) => {
      corpusCache = corpus;
      inFlight = null;
      return corpus;
    })
    .catch((err) => {
      inFlight = null; // allow a retry on the next call after a failure
      throw err;
    });
  return inFlight;
}

/**
 * Exact resolve a `?ref=<slug>` to its corpus hotel. Returns null when the slug
 * is not in the corpus (→ caller routes to explore mode · NEVER a default hotel).
 */
export async function findCorpusBySlug(slug: string): Promise<CorpusHotel | null> {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  const corpus = await loadSearchCorpus();
  return corpus.find((h) => h.slug.toLowerCase() === s) ?? null;
}

/** Haversine distance in km between two WGS84 points (local · no array dep). */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface CorpusCompsetMember {
  hotel: CorpusHotel;
  distanceKm: number;
}

export interface CorpusCompset {
  subject: CorpusHotel;
  competitors: CorpusCompsetMember[];
  suggested: CorpusCompsetMember[];
}

/**
 * Build the compset for a subject slug from the REAL corpus:
 *   - subject     = the corpus hotel for `slug` (null when it doesn't resolve)
 *   - competitors = 4 nearest hotels (Haversine on real lat/lng) within ±1★
 *   - suggested   = next 3 nearest
 *
 * Returns null when the slug doesn't resolve → the caller surfaces a VISIBLE
 * error and NEVER substitutes a default hotel (no silent Bless).
 */
export async function buildCorpusCompset(slug: string): Promise<CorpusCompset | null> {
  const subject = await findCorpusBySlug(slug);
  if (!subject) return null;
  const corpus = await loadSearchCorpus();
  const sorted = corpus
    .filter((h) => h.slug !== subject.slug)
    // ±1★ similarity · skip rows with no star to compare against
    .filter((h) => h.stars != null && subject.stars != null && Math.abs(h.stars - subject.stars) <= 1)
    .map((h) => ({
      hotel: h,
      distanceKm: haversineKm({ lat: subject.lat, lng: subject.lng }, { lat: h.lat, lng: h.lng }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return {
    subject,
    competitors: sorted.slice(0, 4),
    suggested: sorted.slice(4, 7),
  };
}

/**
 * Soft-resolve a free-text `?q=<text>` to the best corpus hotel (same
 * word-boundary scoring as the landing search). Returns null when nothing
 * scores (→ explore mode). Replaces `findHotelByQuery` over the static array.
 */
export async function findCorpusByQuery(q: string): Promise<CorpusHotel | null> {
  const needle = q.trim().toLowerCase();
  if (!needle) return null;
  const tokens = needle.split(/\s+/).filter(Boolean);
  const corpus = await loadSearchCorpus();
  let best: CorpusHotel | null = null;
  let bestScore = 0;
  for (const h of corpus) {
    const words = [h.name, h.brand ?? "", h.operator ?? "", h.submarket ?? ""]
      .join(" ")
      .toLowerCase()
      .split(/[\s,.\-/&()]+/)
      .filter(Boolean);
    const matches = tokens.filter((t) => words.some((w) => w.startsWith(t))).length;
    const boost = h.name.toLowerCase().startsWith(needle) ? 5 : 0;
    const score = matches * 10 + boost;
    if (score > bestScore) {
      bestScore = score;
      best = h;
    }
  }
  return bestScore > 0 ? best : null;
}
