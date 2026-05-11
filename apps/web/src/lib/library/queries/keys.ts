// QueryKey factory for the Library surface.
//
// Centralised so realtime subscribers (added in a later milestone) can
// invalidate every read with `queryClient.invalidateQueries({ queryKey:
// libraryKeys.all })` on a single `postgres_changes` event, and so the
// pagination wrappers added later compose cleanly under the same root.

export interface LibraryReportsFilter {
  /** When set, restrict to rows that have an active top_promote row. */
  promotedOnly?: boolean;
  /** Optional case-insensitive search term applied to hotel_name. */
  search?: string;
}

export const libraryKeys = {
  all: ["library"] as const,
  reports: () => [...libraryKeys.all, "reports"] as const,
  reportsList: (filter: LibraryReportsFilter = {}) =>
    [...libraryKeys.reports(), "list", filter] as const,
  favoriteIds: (userId: string | null) =>
    [...libraryKeys.all, "favorites", userId ?? "anon"] as const,
};
