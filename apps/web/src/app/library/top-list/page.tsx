import type { Metadata } from "next";
import {
  LibrarySidebar,
  TopReportsListContent,
} from "@/components/library";
import { fetchLibraryReports } from "@/lib/library/server/fetch-library";

export const metadata: Metadata = {
  title: "Top Reports · List · Library",
  description:
    "Promoted institutional hotel opportunities and underwriting intelligence.",
};

export const revalidate = 60;

/**
 * /library/top-list — list-view sibling of /library/top-map. Server
 * Component: prefetches the full library and lets the client filter to
 * top-promoted entries. (Both views share the same prefetch + filter
 * pipeline; no per-route divergence.)
 */
export default async function TopReportsListPage() {
  const initialReports = await fetchLibraryReports();
  return (
    <>
      <LibrarySidebar
        title="Top Reports"
        subtitle="Explore community insights and top promote valuations"
        searchPlaceholder="Search reports..."
      />
      <TopReportsListContent initialReports={initialReports} />
    </>
  );
}
