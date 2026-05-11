"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { libraryKeys } from "./keys";
import { useFavoriteValuationIds } from "./use-favorite-valuation-ids";

export interface ToggleFavoriteInput {
  valuationId: string;
  /** Current favorited state — the mutation flips it. */
  isFavorited: boolean;
}

/**
 * Star/un-star a valuation. Optimistically updates the cache so the
 * table ⭐ column reflects the click immediately, then rolls back on
 * error. Caller is responsible for surfacing "sign in to save" UX when
 * `isAnonymous === true`.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { user, isAnonymous } = useFavoriteValuationIds();

  return useMutation({
    mutationFn: async ({ valuationId, isFavorited }: ToggleFavoriteInput) => {
      if (!user) throw new Error("Sign in to save favourites.");
      const supabase = createBrowserSupabaseClient();
      if (isFavorited) {
        const { error } = await supabase
          .from("favorite_reports")
          .delete()
          .eq("user_id", user.id)
          .eq("valuation_id", valuationId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("favorite_reports")
          .insert({ user_id: user.id, valuation_id: valuationId });
        if (error) throw new Error(error.message);
      }
      return { valuationId, isFavorited: !isFavorited };
    },
    onMutate: async ({ valuationId, isFavorited }) => {
      if (!user) return { rolledBack: false };
      const key = libraryKeys.favoriteIds(user.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(
        key,
        isFavorited
          ? previous.filter((id) => id !== valuationId)
          : Array.from(new Set([...previous, valuationId])),
      );
      return { rolledBack: false, previous };
    },
    onError: (_err, _input, context) => {
      if (!user || !context?.previous) return;
      queryClient.setQueryData<string[]>(
        libraryKeys.favoriteIds(user.id),
        context.previous,
      );
    },
    onSettled: () => {
      if (!user) return;
      // Authoritative re-read; cheap because favourites is a small set.
      queryClient.invalidateQueries({
        queryKey: libraryKeys.favoriteIds(user.id),
      });
    },
    meta: { isAnonymous },
  });
}
