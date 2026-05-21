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

/** Canonical default reference hotel for /compset when no ?ref param. */
export const REFERENCE_HOTEL: CompetitorHotel = toCompetitorHotel(
  MADRID_HOTELS.find((h) => h.id === DEFAULT_MADRID_HOTEL_ID) ?? MADRID_HOTELS[0],
);

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
 * CAPAS panel default state · Phase 2 (2026-05-22).
 *
 * 4 institutional toggles in 3 groups:
 *   · DEMANDA TURÍSTICA · heatmap (Demanda Turística · default ON) +
 *                         eating (Gastronomía · default OFF · radio)
 *   · MOVILIDAD         · metro (Conectividad · default ON)
 *   · ZONIFICACIÓN      · historico (Centro Histórico · default ON · HV-native)
 *
 * Label text is the institutional vocabulary surfaced to end users.
 * Internal IDs stay stable to avoid breaking downstream consumers.
 */
export const DEFAULT_LAYERS: MapLayer[] = [
  { id: "heatmap",   label: "Demanda Turística", enabled: true  },
  { id: "eating",    label: "Gastronomía",       enabled: false },
  { id: "metro",     label: "Conectividad",      enabled: true  },
  { id: "historico", label: "Centro Histórico",  enabled: true  },
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
 * Fetches the compset for a given reference hotel · Madrid registry.
 *
 * Honours the `hotelId` argument (default: canonical Bless Hotel
 * Madrid) so the search → /compset?ref flow drives a per-subject map.
 *
 * Tier 3 swap path: replace this body with a Supabase query.
 */
export async function fetchCompset(hotelId: string): Promise<{
  referenceHotel: CompetitorHotel;
  competitors: CompetitorHotel[];
  suggested: CompetitorHotel[];
}> {
  // Simulate realistic network latency · matches previous behaviour so
  // skeleton/loading states still animate.
  await new Promise<void>((r) => setTimeout(r, 400));

  const { subject, competitors, suggested } = buildCompsetForHotel(hotelId);
  return {
    referenceHotel: toCompetitorHotel(subject),
    competitors: competitors.map(toCompetitorHotel),
    suggested: suggested.map(toCompetitorHotel),
  };
}
