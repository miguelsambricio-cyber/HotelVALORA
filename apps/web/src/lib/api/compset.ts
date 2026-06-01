import type { CompetitorHotel, MapLayer } from "@/types/compset";
import {
  MADRID_HOTELS,
  buildCompsetForHotel,
  DEFAULT_MADRID_HOTEL_ID,
  RECOMMENDED_MADRID_ANCHOR_IDS,
  type MadridHotelEntry,
} from "@/lib/data/madrid-hotels";

/**
 * Compset API adapter — Tier 2 Madrid-mock implementation.
 *
 * Source-of-truth is the canonical Madrid registry in
 * lib/data/madrid-hotels.ts. The subject hotel id (default
 * "bless-hotel-madrid") drives the compset · the helper
 * `buildCompsetForHotel` computes 4 active competitors + 3 suggested
 * by Haversine distance with ±1 star similarity.
 *
 * Replaces the previous Sevilla mock (Hotel Las Casas de la Judería ·
 * Alfonso XIII · Mercer · EME Catedral · Villapanés · Gran Meliá Colón)
 * which had no relation to the institutional Madrid workflow.
 *
 * Tier 3 swap (when Supabase is ready):
 *   fetchCompset(hotelId) → Supabase query against hotel_canonical +
 *   PostGIS proximity search · response shape unchanged.
 */

function toCompetitorHotel(h: MadridHotelEntry): CompetitorHotel {
  return {
    id: h.id,
    name: h.name,
    city: "Madrid",
    address: h.address,
    stars: h.stars,
    adr: h.adr,
    revpar: h.revpar,
    occupancy: h.occupancy,
    category: h.category,
    brand: h.brand,
    coordinates: h.coordinates,
  };
}

/**
 * Neutral loading placeholder for `useCompset` initial state · NOT a real
 * hotel (B3 · removes the last silent-Bless default). The real subject loads
 * from `/api/hotels/compset` within ~1s; on failure the error screen renders.
 * Coordinates = Madrid centre so the map's initial frame is sane during load.
 */
export const REFERENCE_HOTEL: CompetitorHotel = {
  id: "",
  name: "",
  city: "Madrid",
  stars: 0,
  coordinates: { lng: -3.7038, lat: 40.4168 },
};

/**
 * Backwards-compat exports · used by older /compset render paths
 * (some sub-components import these directly).
 * The default 4 active + 3 suggested are computed against the canonical
 * default reference hotel so the legacy direct-import callsites get a
 * Madrid-coherent set instead of the previous Sevilla mocks.
 */
const DEFAULT_COMPSET = buildCompsetForHotel(DEFAULT_MADRID_HOTEL_ID);

export const MOCK_ACTIVE_COMPETITORS: CompetitorHotel[] =
  DEFAULT_COMPSET.competitors.map(toCompetitorHotel);

export const MOCK_SUGGESTED_COMPETITORS: CompetitorHotel[] =
  DEFAULT_COMPSET.suggested.map(toCompetitorHotel);

/**
 * CAPAS panel default state · Phase 2.C.2 (2026-05-22).
 *
 * AVUXI categories (heatmap + metro) are now managed exclusively by
 * AVUXI's native UI · CAPAS panel only owns the HV-native polygon.
 * See `types/compset.ts` for the rationale.
 */
export const DEFAULT_LAYERS: MapLayer[] = [
  { id: "historico", label: "Centro Histórico", enabled: true },
];

/**
 * All Madrid hotels in CompetitorHotel shape · drives the bare-/compset
 * institutional explore mode. The map renders ONE pin per hotel so the
 * visitor can browse the universe before choosing a subject. Click on a
 * pin opens its popup with a "Iniciar análisis" CTA that navigates to
 * /compset?ref=<hotel.id> · the canonical entry into analysis mode.
 */
export const ALL_MADRID_AS_COMPETITORS: CompetitorHotel[] =
  MADRID_HOTELS.map(toCompetitorHotel);

/**
 * Curated institutional anchor set surfaced in the asset-selection
 * panel · 5 high-recall Madrid names spanning multiple submarkets.
 * Drives the "Recommended nearby assets" tile list inside the panel.
 */
export const RECOMMENDED_MADRID_ANCHORS: CompetitorHotel[] =
  RECOMMENDED_MADRID_ANCHOR_IDS
    .map((id) => MADRID_HOTELS.find((h) => h.id === id))
    .filter((h): h is MadridHotelEntry => h !== undefined)
    .map(toCompetitorHotel);

/**
 * Fetches the compset for a subject slug from the REAL corpus (B2).
 *
 * Calls `/api/hotels/compset?ref=<slug>` which resolves the subject against
 * `hotel_canonical` and computes the nearest ±1★ competitors by Haversine on
 * real coordinates. The subject is ALWAYS the requested hotel — when the slug
 * doesn't resolve this THROWS (the route 404s); the `useCompset` hook surfaces
 * a visible error. It NEVER substitutes a default hotel (the silent Bless
 * fallback is gone).
 */
export async function fetchCompset(hotelId: string): Promise<{
  referenceHotel: CompetitorHotel;
  competitors: CompetitorHotel[];
  suggested: CompetitorHotel[];
}> {
  const res = await fetch(`/api/hotels/compset?ref=${encodeURIComponent(hotelId)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`No se pudo cargar el hotel "${hotelId}"`);
    }
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      detail = j?.error ? ` (${j.error})` : "";
    } catch {
      /* ignore */
    }
    throw new Error(`No se pudo cargar el compset${detail}`);
  }
  return res.json() as Promise<{
    referenceHotel: CompetitorHotel;
    competitors: CompetitorHotel[];
    suggested: CompetitorHotel[];
  }>;
}
