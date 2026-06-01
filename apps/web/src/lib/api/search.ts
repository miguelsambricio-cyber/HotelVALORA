/**
 * Hotel search adapter — Tier 3 · real corpus (select-corpus · A1).
 *
 * The landing search now filters the FULL canonical Madrid corpus (226 hotels
 * from `hotel_canonical`) instead of the static 18-hotel mock. Architecture
 * (D1): the slim corpus is fetched ONCE from `/api/hotels/search-corpus`,
 * cached at module scope in the browser, and filtered LOCALLY on every
 * keystroke — instant, no per-keystroke network round-trip, no artificial
 * latency. 226 rows is tiny; local filtering beats hitting Supabase per key.
 *
 * Public contract is unchanged: `searchHotels(query, limit)` → `HotelSearchHit[]`
 * with `id = slug` (the same slug the report resolver + compset consume), so
 * `SearchBar` / `HeroSearch` / `useHotelSearch` need no changes.
 *
 * Future server-search swap (when the corpus outgrows local filtering): the
 * route accepts `?q=` + debounce and returns only matches; this function calls
 * it instead of filtering locally — signature stays identical.
 */

import type { HotelSearchHit } from "@/types/hotel-search";
import { loadCorpusClient, type CorpusHit } from "@/lib/hotels/corpus-client";

function toHit(h: CorpusHit): HotelSearchHit {
  return {
    id: h.slug,
    name: h.name,
    city: "Madrid",
    country: "ES",
    brand: h.brand,
    operator: h.operator,
    star_rating: h.stars,
  };
}

export async function searchHotels(
  query: string,
  limit = 8,
): Promise<HotelSearchHit[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const corpus = await loadCorpusClient();

  // Tokenise so multi-word searches ("senator barajas", "plaza españa") match
  // a hotel containing each token across name / brand / operator / submarket.
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = corpus
    .map((h) => {
      // WORD-boundary match: split the searchable fields into words and match a
      // token only when some WORD starts with it. "riu" hits "Riu Plaza" but NOT
      // "audito[riu]m" / "at[riu]m" (no word starts with "riu"). Splits on
      // whitespace + common punctuation (comma · hyphen · slash · &).
      const words = [h.name, h.brand ?? "", h.operator ?? "", h.submarket ?? ""]
        .join(" ")
        .toLowerCase()
        .split(/[\s,.\-/&()]+/)
        .filter(Boolean);
      const matches = tokens.filter((t) => words.some((w) => w.startsWith(t))).length;
      // Name-prefix boost · feels closer to autocomplete intent.
      const namePrefixBoost = h.name.toLowerCase().startsWith(q) ? 5 : 0;
      return { hotel: h, score: matches * 10 + namePrefixBoost };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => toHit(x.hotel));
}
