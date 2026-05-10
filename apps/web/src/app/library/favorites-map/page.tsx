import type { Metadata } from "next";
import { HotelMap, LibrarySidebar } from "@/components/library";

export const metadata: Metadata = {
  title: "Favoritos · Library",
  description:
    "Saved valuations, community insights and TOP PROMOTE hotels on the institutional map.",
};

/**
 * /library/favorites-map — first page of the institutional Library.
 *
 * Hosts the saved-reports / community / top-promote map view. Layout is
 * a 300 px sticky sidebar on the left and an edge-to-edge mock map on
 * the right; the floating preview card lives inside the map layer so
 * resizing the viewport reflows correctly without prop wiring.
 */
export default function FavoritesMapPage() {
  return (
    <>
      <LibrarySidebar />
      <HotelMap listViewHref="/library/favorites-list" />
    </>
  );
}
