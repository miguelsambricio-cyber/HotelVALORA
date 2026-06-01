import type { CompetitorHotel } from "@/types/compset";

/**
 * Client-side corpus cache (D1) · shared by the landing search (A) and the
 * /compset explore mode (B3). Fetches the slim 226-hotel corpus ONCE from
 * `/api/hotels/search-corpus`, caches it at module scope in the browser, and
 * hands it to local filters/maps — no per-interaction network round-trip.
 */

/** Slim corpus row as served by `/api/hotels/search-corpus`. */
export interface CorpusHit {
  slug: string;
  name: string;
  brand: string | null;
  operator: string | null;
  stars: number | null;
  submarket: string | null;
  lat: number;
  lng: number;
}

let cache: CorpusHit[] | null = null;
let inFlight: Promise<CorpusHit[]> | null = null;

export async function loadCorpusClient(): Promise<CorpusHit[]> {
  if (cache !== null) return cache;
  if (inFlight !== null) return inFlight;
  inFlight = fetch("/api/hotels/search-corpus")
    .then((r) => {
      if (!r.ok) throw new Error(`search-corpus fetch failed: ${r.status}`);
      return r.json() as Promise<CorpusHit[]>;
    })
    .then((data) => {
      cache = data;
      inFlight = null;
      return data;
    })
    .catch((err) => {
      inFlight = null; // allow retry after a failure
      throw err;
    });
  return inFlight;
}

/**
 * Map a corpus row to the `CompetitorHotel` shape used by the map + panels.
 * Per-hotel ADR/RevPAR/Occupancy/category are intentionally omitted (the corpus
 * has none · D2). `submarket` is carried for the card (B4).
 */
export function corpusToCompetitor(h: CorpusHit): CompetitorHotel {
  return {
    id: h.slug,
    name: h.name,
    city: "Madrid",
    stars: h.stars ?? 0,
    brand: h.brand ?? undefined,
    submarket: h.submarket ?? undefined,
    coordinates: { lng: h.lng, lat: h.lat },
  };
}
