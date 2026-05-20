import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CanonicalHotelRow } from "@/lib/report/canonical-reader";
import {
  getMockCompetitiveSet,
  type CompetitiveSetData,
  type CompetitorProperty,
  type FacilityKey,
} from "@/lib/report/competitive-set-data";

/**
 * Phase 4 · canonical → CompetitiveSetData mapper.
 *
 * Subject hotel from canonical. Compset peers picked by chain_scale +
 * submarket (or market when submarket too narrow) heuristic until the
 * dedicated COMPSET_MASTER ships per-hotel curated peer sets. Subject
 * is always first; up to 4 peers follow.
 */

const FACILITY_KEYS: FacilityKey[] = ["bar", "restaurant", "rooftop", "meeting", "gym", "spa"];

function amenityToFacilities(amenities: Record<string, boolean | null> | null): Record<FacilityKey, boolean> {
  const out: Record<FacilityKey, boolean> = {
    bar: false,
    restaurant: false,
    rooftop: false,
    meeting: false,
    gym: false,
    spa: false,
  };
  if (!amenities) return out;
  out.bar = amenities.bar === true;
  out.restaurant = amenities.restaurant === true;
  out.rooftop = amenities.rooftop === true;
  out.meeting = amenities.meet === true || amenities.meeting === true;
  out.gym = amenities.gym === true;
  out.spa = amenities.spa === true;
  return out;
}

function reviewToLocationScore(reviewScore: number | null): number {
  return reviewScore !== null ? Number(reviewScore.toFixed(1)) : 0;
}

function distanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface PeerRow {
  id: string;
  canonical_name: string | null;
  star_rating: number | null;
  total_rooms: number | null;
  total_keys: number | null;
  amenities: Record<string, boolean | null> | null;
  review_score: number | null;
  lat: number | null;
  lng: number | null;
  submarket_id: string | null;
  submarket_name: string | null;
}

export async function mapCanonicalToCompetitiveSet(
  subject: CanonicalHotelRow,
): Promise<CompetitiveSetData> {
  const mock = getMockCompetitiveSet();

  // Build the subject property card
  const subjectKeys = subject.total_keys ?? subject.total_rooms ?? 0;
  const subjectFacilities = amenityToFacilities(subject.amenities);
  const subjectProperty: CompetitorProperty = {
    id: "subject",
    isSubject: true,
    name: subject.canonical_name ?? "Subject Property",
    stars: subject.star_rating ?? 0,
    keys: subjectKeys,
    submarket: subject.submarket_name ?? "—",
    facilities: subjectFacilities,
    locationScore: reviewToLocationScore(subject.review_score),
    distance: null,
  };

  // Fetch peers · same chain_scale + same submarket, fall back to market-wide
  const sb = getSupabaseAdmin() as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string | null) => unknown;
        neq: (col: string, val: string) => unknown;
      };
    };
  };

  const PEER_SELECT =
    "id,canonical_name,star_rating,total_rooms,total_keys,amenities,review_score,lat,lng,submarket_id";

  let peers: PeerRow[] = [];
  if (subject.chain_scale && subject.submarket_name) {
    const r = await (((((sb.from("hotel_canonical").select(PEER_SELECT) as {
      eq: (c: string, v: string | null) => unknown;
    }).eq("chain_scale", subject.chain_scale) as { eq: (c: string, v: string) => unknown }
    ).eq("city_normalized", "Madrid") as { neq: (c: string, v: string) => unknown }
    ).neq("id", subject.id) as { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> }
    ).limit(20));
    if (!r.error && r.data) peers = r.data as PeerRow[];
  }

  // Resolve submarket_name per peer · prefer same submarket as subject when possible
  if (peers.length > 0) {
    const sameSub = peers.filter((p) => p.submarket_id && subject.submarket_name && p.submarket_id);
    if (sameSub.length >= 3) peers = sameSub;
  }

  // Filter + rank by geo proximity to subject when lat/lng available
  if (subject.lat && subject.lng) {
    const subjectLatLng = { lat: subject.lat, lng: subject.lng };
    peers = peers
      .filter((p) => p.lat !== null && p.lng !== null)
      .map((p) => ({
        ...p,
        _distKm: haversineKm(subjectLatLng, { lat: p.lat as number, lng: p.lng as number }),
      }))
      .sort((a, b) => (a as PeerRow & { _distKm: number })._distKm - (b as PeerRow & { _distKm: number })._distKm)
      .slice(0, 4);
  } else {
    peers = peers.slice(0, 4);
  }

  // Resolve submarket names for the picked peers in a single query
  const submarketIds = Array.from(new Set(peers.map((p) => p.submarket_id).filter(Boolean) as string[]));
  let submarketNames = new Map<string, string>();
  if (submarketIds.length > 0) {
    const sbIn = sb as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          in: (c: string, v: string[]) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
    const r = await sbIn.from("submarket").select("id,name").in("id", submarketIds);
    if (!r.error && r.data) {
      submarketNames = new Map(
        (r.data as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]),
      );
    }
  }

  const peerProperties: CompetitorProperty[] = peers.map((p, i) => {
    const dist = (p as PeerRow & { _distKm?: number })._distKm;
    return {
      id: p.id ?? `peer-${i}`,
      isSubject: false,
      name: p.canonical_name ?? "Peer Hotel",
      stars: p.star_rating ?? 0,
      keys: p.total_keys ?? p.total_rooms ?? 0,
      submarket: (p.submarket_id && submarketNames.get(p.submarket_id)) ?? "—",
      facilities: amenityToFacilities(p.amenities),
      locationScore: reviewToLocationScore(p.review_score),
      distance: typeof dist === "number" ? distanceLabel(dist) : null,
    };
  });

  return {
    properties: [subjectProperty, ...peerProperties],
    // Gallery falls back to mock until image-strategy ships
    gallery: mock.gallery,
  };
}
