"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { libraryKeys } from "./keys";

/**
 * Returns the set of `valuation_id`s the current Supabase user has
 * marked as favourite. Unauthenticated callers get an empty set + the
 * `isAnonymous` flag set to true — the Library adapter then renders
 * every public row as starred (the legacy demo behaviour).
 *
 * The hook also exposes the live Supabase user object so mutation
 * hooks (`useToggleFavorite`) and components that need the id (e.g.
 * uploads keyed under `{user.id}/...`) can read it without their own
 * round-trip.
 */
export function useFavoriteValuationIds() {
  const user = useSupabaseSessionUser();

  const query = useQuery({
    queryKey: libraryKeys.favoriteIds(user?.id ?? null),
    enabled: user !== null,
    queryFn: async (): Promise<string[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("favorite_reports")
        .select("valuation_id");
      if (error) throw new Error(`Favourites fetch failed: ${error.message}`);
      return (data ?? []).map((row) => row.valuation_id);
    },
    staleTime: 60 * 1000,
  });

  return {
    ids: query.data ?? [],
    user,
    isAnonymous: user === null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

// ─── Internal: light Supabase session subscription ──────────────────────────
//
// We only need the user id + whether a session exists. Reading
// `supabase.auth.getUser()` once on mount and subscribing to
// `onAuthStateChange` keeps the hook reactive without pulling another
// dependency (no @supabase/auth-helpers-react here).

function useSupabaseSessionUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return user;
}
