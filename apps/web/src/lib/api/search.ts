/**
 * Hotel search adapter — Tier 2 Madrid-mock implementation.
 *
 * Reads the canonical Madrid registry from lib/data/madrid-hotels.ts
 * and maps to the HotelSearchHit shape consumed by useHotelSearch /
 * SearchBar / HeroSearch.
 *
 * Why a mock today:
 *   · No Supabase `hotel_canonical` table is wired to production yet.
 *   · The agent-2 enrichment workstream has 200+ canonical Madrid
 *     hotels staged on their branch but the migration is operator-gated.
 *   · Tier 3 (real DB) replaces the body of `searchHotels()` with a
 *     Supabase or FastAPI call · the public signature stays identical.
 *
 * Tier 2 design goals (this file):
 *   · Match the institutional vocabulary the operator types ·
 *     "Bless Hotel Madrid" · "Eurostars Madrid Tower" · "Plaza España" ·
 *     "Castellana" · "Salamanca" should all surface relevant hits.
 *   · Be the same source of truth as the /compset workflow so a search
 *     selection lands on a coherent map experience.
 *
 * Future Tier 3 swap (when Supabase is ready):
 *
 *   import { apiClient } from "./client";
 *   const res = await apiClient.get("/hotels/search", {
 *     params: { q: query, limit, city: "Madrid" },
 *   });
 *   return res.data.data.map(toHotelSearchHit);
 */

import {
  MADRID_HOTELS,
  type MadridHotelEntry,
} from "@/lib/data/madrid-hotels";
import type { HotelSearchHit } from "@/types/hotel-search";

function toHit(h: MadridHotelEntry): HotelSearchHit {
  return {
    id: h.id,
    name: h.name,
    city: "Madrid",
    country: "ES",
    brand: h.brand ?? null,
    operator: h.operator ?? null,
    star_rating: h.stars,
  };
}

export async function searchHotels(
  query: string,
  limit = 8,
): Promise<HotelSearchHit[]> {
  // Simulate realistic network latency · keeps the loading spinner honest.
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 80));

  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Tokenise the query so multi-word searches ("madrid centro" · "plaza
  // españa") match any hotel containing each token in name / brand /
  // operator / district / address. Improves perception vs strict
  // substring match.
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = MADRID_HOTELS
    .map((h) => {
      const haystack = [
        h.name,
        h.brand ?? "",
        h.operator ?? "",
        h.district,
        h.address,
        h.category,
      ]
        .join(" ")
        .toLowerCase();

      const matches = tokens.filter((t) => haystack.includes(t)).length;
      // Tier-1 boost: exact name prefix match scores higher · feels
      // closer to autocomplete intent.
      const namePrefixBoost = h.name.toLowerCase().startsWith(q) ? 5 : 0;
      return { hotel: h, score: matches * 10 + namePrefixBoost };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => toHit(x.hotel));
}
