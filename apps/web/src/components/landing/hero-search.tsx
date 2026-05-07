"use client";

/**
 * Client boundary for the hero search bar.
 *
 * Owns router navigation so the server-component HeroSection stays clean.
 * onSelect → /assets/hotels/{id}  (future hotel detail page)
 * onViewAll → /assets/hotels?search={query}
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
    // TODO: navigate to hotel detail / valuation page once that route exists
    router.push(`/assets/hotels?search=${encodeURIComponent(hotel.name)}`);
  }

  function handleViewAll(query: string) {
    router.push(`/assets/hotels?search=${encodeURIComponent(query)}`);
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
