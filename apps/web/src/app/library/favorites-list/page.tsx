import type { Metadata } from "next";
import { FavoritesListContent, LibrarySidebar } from "@/components/library";
import { fetchLibraryReports } from "@/lib/library/server/fetch-library";

export const metadata: Metadata = {
  title: "Favoritos · List · Library",
  description:
    "Consolidated institutional table view of saved hotel valuations.",
};

/** Revalidate every 60s — library data changes slowly; this keeps the
 *  SSR'd seed reasonably fresh without going fully dynamic. */
export const revalidate = 60;

/**
 * /library/favorites-list — institutional terminal-grade table view of
 * the public library corpus.
 *
 * Server Component: prefetches the valuations at request/revalidate time
 * so the SSR'd HTML contains the actual hotel rows. The client-side
 * React Query layer still runs and refines (favourites resolution,
 * background refetch), but the page is never empty waiting on hydration.
 */
export default async function FavoritesListPage() {
  const initialReports = await fetchLibraryReports();
  return (
    <>
      <LibrarySidebar />
      <FavoritesListContent initialReports={initialReports} />
    </>
  );
}
