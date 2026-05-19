"use client";

/**
 * Client boundary for the hero search bar.
 *
 * Owns router navigation so the server-component HeroSection stays clean.
 *
 * Routing contract (post-Tier-1 restoration · 2026-05-20):
 *   onSelect    → /madrid-centro?q=<hotel name>  · curated showcase chooser
 *                                                  (soft-match against the
 *                                                   3-hotel Madrid Centro
 *                                                   institutional dataset)
 *   onViewAll   → /madrid-centro?q=<query>        · same · always lands on
 *                                                  a populated surface ·
 *                                                  free-text Enter target
 *   onMapView   → /compset                        · institutional map flow
 *                                                  (Mapbox GL interactive ·
 *                                                  competitor panel ·
 *                                                  separate from the
 *                                                  curated showcase)
 *
 * Why two destinations:
 *   · `/madrid-centro` is the curated demo · 3 anonymised reference hotels ·
 *     deterministic SSG · always populated.
 *   · `/compset` is the institutional workflow surface · interactive map +
 *     competitor selection · the canonical step-2 of the valuation flow.
 *   The Map button explicitly opts into `/compset` so the institutional
 *   flow stays reachable from the landing. A previous revision routed Map
 *   to `/madrid-centro` which collapsed the two surfaces · this restored.
 *
 * Why not /assets/hotels: that route fronts the FastAPI dashboard which is
 * no longer wired in production · would yield an empty table.
 */

import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/search-bar";
import type { HotelSearchHit } from "@/types/hotel-search";

interface HeroSearchProps {
  className?: string;
}

export function HeroSearch({ className }: HeroSearchProps) {
  const router = useRouter();

  function handleSelect(hotel: HotelSearchHit) {
    router.push(`/madrid-centro?q=${encodeURIComponent(hotel.name)}`);
  }

  function handleViewAll(query: string) {
    const q = query.trim();
    if (q.length === 0) {
      router.push("/madrid-centro");
    } else {
      router.push(`/madrid-centro?q=${encodeURIComponent(q)}`);
    }
  }

  function handleMapView() {
    router.push("/compset");
  }

  return (
    <SearchBar
      className={className}
      onSelect={handleSelect}
      onViewAll={handleViewAll}
      onMapView={handleMapView}
    />
  );
}
