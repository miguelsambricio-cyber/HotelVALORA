"use client";

/**
 * Client boundary for the hero search bar.
 *
 * Owns router navigation so the server-component HeroSection stays clean.
 *
 * Routing contract (post-Tier-2 institutional flow restoration · 2026-05-20):
 *
 *   onSelect(hotel) → /compset?ref=<hotel.id>     · institutional flow ·
 *                                                  subject hotel drives the
 *                                                  map viewport and the
 *                                                  Haversine-derived compset
 *   onViewAll(query)→ /compset?q=<text>           · same flow · server-side
 *                                                  soft-match against the
 *                                                  canonical Madrid registry ·
 *                                                  falls back to default
 *                                                  Bless Hotel Madrid when
 *                                                  the query doesn't match
 *   onMapView()     → /compset                    · direct map entry
 *
 * Why every path lands on /compset:
 *   The institutional flow is `landing → search → map → compset →
 *   underwriting`. Routing all three handlers to /compset preserves the
 *   geo-driven mental model · the visitor never lands on an empty page
 *   or a curated chooser when their intent was a real subject hotel.
 *
 * /madrid-centro remains a separate curated showcase (3 anonymised
 * Madrid hotels) accessible by direct URL · it is no longer a search
 * destination as of this commit.
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
    router.push(`/compset?ref=${encodeURIComponent(hotel.id)}`);
  }

  function handleViewAll(query: string) {
    const q = query.trim();
    if (q.length === 0) {
      router.push("/compset");
    } else {
      router.push(`/compset?q=${encodeURIComponent(q)}`);
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
      mapAlwaysInline
    />
  );
}
