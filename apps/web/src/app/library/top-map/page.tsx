import type { Metadata } from "next";
import { HotelMap, LibrarySidebar } from "@/components/library";

export const metadata: Metadata = {
  title: "Top Reports · Library",
  description:
    "Explore community-driven insights and top-performing institutional hotel valuations.",
};

/**
 * /library/top-map — sibling of /library/favorites-map focused on the
 * Top Promote / community surface. Visual chrome is byte-identical to
 * favorites-map (single institutional language across the Library
 * route group). The page-specific copy + the segmented default tab
 * are the only deltas.
 */
export default function TopReportsMapPage() {
  return (
    <>
      <LibrarySidebar
        title="Top Reports"
        subtitle="Explore community-driven insights and top-performing market valuations."
        searchPlaceholder="Search reports..."
      />
      <HotelMap />
    </>
  );
}
