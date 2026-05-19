"use client";

/**
 * Client boundary for the hero search bar.
 *
 * Owns router navigation so the server-component HeroSection stays clean.
 *
 * Routing contract (post-Madrid-Centro integration · 2026-05-19):
 *   onSelect    → /madrid-centro?q=<hotel name>  · the chooser scopes to a soft-match
 *   onViewAll   → /madrid-centro?q=<query>        · same · always lands on a populated surface
 *   onMapView   → /madrid-centro                  · the institutional showcase replaces /compset
 *
 * Why not /assets/hotels: that route fronts the FastAPI dashboard which is
 * no longer wired in production · would yield an empty table. The Madrid
 * Centro showcase is the canonical institutional surface for now and
 * always renders something.
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
    router.push("/madrid-centro");
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
