import type { Metadata } from "next";
import { HotelMap, LibrarySidebar } from "@/components/library";
import { fetchLibraryReports } from "@/lib/library/server/fetch-library";

export const metadata: Metadata = {
  title: "Top Reports · Library",
  description:
    "Explore community-driven insights and top-performing institutional hotel valuations.",
};

export const revalidate = 60;

/**
 * /library/top-map — sibling of /library/favorites-map focused on the
 * Top Promote / community surface. Server Component: prefetches the
 * library corpus so map pins render server-side.
 */
export default async function TopReportsMapPage() {
  const initialReports = await fetchLibraryReports();
  return (
    <>
      <LibrarySidebar
        title="Top Reports"
        subtitle="Explore community insights and top promote valuations"
        searchPlaceholder="Search reports..."
      />
      <HotelMap listViewHref="/library/top-list" initialReports={initialReports} />
    </>
  );
}
