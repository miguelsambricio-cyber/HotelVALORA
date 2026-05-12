import type { Metadata } from "next";
import { HotelMap, LibrarySidebar } from "@/components/library";
import { fetchLibraryReports } from "@/lib/library/server/fetch-library";

export const metadata: Metadata = {
  title: "Favoritos · Library",
  description:
    "Saved valuations, community insights and TOP PROMOTE hotels on the institutional map.",
};

export const revalidate = 60;

/**
 * /library/favorites-map — first page of the institutional Library.
 *
 * Server Component: prefetches valuations so the map renders with pins
 * server-side. Client hydrates and refines (favourites · refetch).
 */
export default async function FavoritesMapPage() {
  const initialReports = await fetchLibraryReports();
  return (
    <>
      <LibrarySidebar />
      <HotelMap listViewHref="/library/favorites-list" initialReports={initialReports} />
    </>
  );
}
