import type { Metadata } from "next";
import { FavoritesListContent, LibrarySidebar } from "@/components/library";

export const metadata: Metadata = {
  title: "Favoritos · List · Library",
  description:
    "Consolidated institutional table view of saved hotel valuations.",
};

/**
 * /library/favorites-list — institutional terminal-grade table view of
 * the same six mock reports rendered on /library/favorites-map. Sidebar,
 * shell, header, footer are byte-identical to the map page; only the
 * content column swaps.
 */
export default function FavoritesListPage() {
  return (
    <>
      <LibrarySidebar />
      <FavoritesListContent />
    </>
  );
}
