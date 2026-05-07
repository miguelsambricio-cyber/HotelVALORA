import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type {
  DedupSummary,
  MergeRecommendationDetail,
  MergeRecommendationListItem,
  ScanResult,
} from "@/types/dedup";
import type { PagedResponse, SingleResponse } from "@/types/review";

export function useDedupSummary() {
  return useQuery({
    queryKey: ["dedup", "summary"],
    queryFn: () =>
      apiClient
        .get<SingleResponse<DedupSummary>>("/dedup/summary")
        .then((r) => r.data.data),
  });
}

export function useMergeRecommendations(
  page = 0,
  limit = 20,
  status = "pending_review",
  recommendation?: string,
  confidenceLabel?: string,
) {
  return useQuery({
    queryKey: ["dedup", "recommendations", page, limit, status, recommendation, confidenceLabel],
    queryFn: () =>
      apiClient
        .get<PagedResponse<MergeRecommendationListItem>>("/dedup/recommendations", {
          params: {
            status,
            recommendation: recommendation ?? undefined,
            confidence_label: confidenceLabel ?? undefined,
            limit,
            offset: page * limit,
          },
        })
        .then((r) => r.data),
  });
}

export function useMergeRecommendationDetail(id: string | null) {
  return useQuery({
    queryKey: ["dedup", "recommendations", id],
    queryFn: () =>
      apiClient
        .get<SingleResponse<MergeRecommendationDetail>>(`/dedup/recommendations/${id}`)
        .then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useRunScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (city?: string) =>
      apiClient
        .post<SingleResponse<ScanResult>>("/dedup/scan", null, {
          params: city ? { city } : undefined,
        })
        .then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dedup"] }),
  });
}

export function useAcceptRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apiClient.post(`/dedup/recommendations/${id}/accept`, { notes: notes ?? null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dedup"] });
      qc.invalidateQueries({ queryKey: ["review", "summary"] });
    },
  });
}

export function useDismissRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apiClient.post(`/dedup/recommendations/${id}/dismiss`, { notes: notes ?? null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dedup"] });
      qc.invalidateQueries({ queryKey: ["review", "summary"] });
    },
  });
}
