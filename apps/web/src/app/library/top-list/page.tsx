import type { Metadata } from "next";
import {
  LibrarySidebar,
  TopReportsListContent,
} from "@/components/library";

export const metadata: Metadata = {
  title: "Top Reports · List · Library",
  description:
    "Promoted institutional hotel opportunities and underwriting intelligence.",
};

/**
 * /library/top-list — list-view sibling of /library/top-map. Reuses the
 * shared sidebar (Top Reports copy, TOP segmented active) + the
 * institutional reports table with its REF column toggled on.
 */
export default function TopReportsListPage() {
  return (
    <>
      <LibrarySidebar
        title="Top Reports"
        subtitle="Explore community insights and top promote valuations"
        searchPlaceholder="Search reports..."
      />
      <TopReportsListContent />
    </>
  );
}
