import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type {
  AliasConflict,
  LowConfidenceAlias,
  PagedResponse,
  ReviewSummary,
  SingleResponse,
} from "@/types/review";

const LOW_CONFIDENCE_THRESHOLD = 0.65;

export function useReviewSummary() {
  return useQuery({
    queryKey: ["review", "summary"],
    queryFn: () =>
      apiClient
        .get<SingleResponse<ReviewSummary>>("/review/summary")
        .then((r) => r.data.data),
  });
}

export function useOpenConflicts(page = 0, limit = 20) {
  return useQuery({
    queryKey: ["review", "conflicts", page, limit],
    queryFn: () =>
      apiClient
        .get<PagedResponse<AliasConflict>>("/aliases/conflicts", {
          params: { status: "open", limit, offset: page * limit },
        })
        .then((r) => r.data),
  });
}

export function useLowConfidenceAliases(page = 0, limit = 20) {
  return useQuery({
    queryKey: ["review", "low-confidence", page, limit],
    queryFn: () =>
      apiClient
        .get<PagedResponse<LowConfidenceAlias>>("/aliases/hotels", {
          params: {
            confidence_max: LOW_CONFIDENCE_THRESHOLD,
            active_only: true,
            limit,
            offset: page * limit,
          },
        })
        .then((r) => r.data),
  });
}

export function useResolveConflict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conflictId,
      resolvedAssetId,
      notes,
    }: {
      conflictId: string;
      resolvedAssetId: string;
      notes?: string;
    }) =>
      apiClient.post(`/aliases/conflicts/${conflictId}/resolve`, {
        resolved_asset_id: resolvedAssetId,
        resolution_strategy: "manual",
        resolution_notes: notes ?? null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review"] }),
  });
}

export function useIgnoreConflict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conflictId,
      notes,
    }: {
      conflictId: string;
      notes?: string;
    }) =>
      apiClient.post(`/aliases/conflicts/${conflictId}/ignore`, {
        resolution_notes: notes ?? null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review"] }),
  });
}

export function useApproveAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aliasId: string) =>
      apiClient.patch(`/aliases/hotels/${aliasId}`, { is_manual_override: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review"] }),
  });
}

export function useDeactivateAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aliasId: string) => apiClient.delete(`/aliases/hotels/${aliasId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review"] }),
  });
}
