import { NextResponse } from "next/server";
import { buildCorpusCompset, type CorpusHotel } from "@/lib/hotels/corpus-reader";
import type { CompetitorHotel } from "@/types/compset";

/**
 * B2 · computes the compset for `?ref=<slug>` from the REAL corpus
 * (subject + 4 nearest ±1★ competitors + 3 suggested · Haversine on real
 * lat/lng). Returns 404 when the slug doesn't resolve → the client surfaces a
 * VISIBLE error and NEVER falls back to a default hotel (no silent Bless).
 *
 * Per-hotel ADR/RevPAR/Occupancy/category are intentionally absent (the corpus
 * has none · D2). The card KPI bar is removed in B4; here we ship submarket +
 * distanceKm instead.
 */
export const dynamic = "force-dynamic";

function toCompetitor(h: CorpusHotel, distanceKm?: number): CompetitorHotel {
  return {
    id: h.slug,
    name: h.name,
    city: "Madrid",
    stars: h.stars ?? 0,
    brand: h.brand ?? undefined,
    submarket: h.submarket ?? undefined,
    distanceKm,
    coordinates: { lng: h.lng, lat: h.lat },
  };
}

export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref")?.trim() ?? "";
  if (!ref) {
    return NextResponse.json({ error: "ref required" }, { status: 400 });
  }
  try {
    const compset = await buildCorpusCompset(ref);
    if (!compset) {
      return NextResponse.json({ error: `Hotel no encontrado: ${ref}` }, { status: 404 });
    }
    return NextResponse.json({
      referenceHotel: toCompetitor(compset.subject),
      competitors: compset.competitors.map((m) => toCompetitor(m.hotel, m.distanceKm)),
      suggested: compset.suggested.map((m) => toCompetitor(m.hotel, m.distanceKm)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "compset failed" },
      { status: 500 },
    );
  }
}
