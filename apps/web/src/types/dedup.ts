export interface ComponentScore {
  score: number | null;
  weight: number;
  detail: string;
}

export interface ScoreBreakdown {
  name_exact: ComponentScore;
  name_fuzzy: ComponentScore;
  city: ComponentScore;
  operator: ComponentScore;
  address: ComponentScore;
}

export interface FalsePositiveSignal {
  signal_type: string;
  severity: number;
  detail: string;
}

export interface AssetSnapshot {
  id: string;
  asset_name: string;
  city: string;
  operator: string | null;
  brand: string | null;
  star_rating: number | null;
  keys: number | null;
  chain_scale: string | null;
  address: string | null;
  submarket: string | null;
  status: string | null;
}

export type RecommendationTier =
  | "auto_merge"
  | "needs_review"
  | "likely_duplicate"
  | "not_duplicate";

export type RecommendationStatus =
  | "pending_review"
  | "accepted"
  | "dismissed"
  | "expired";

export interface MergeRecommendationListItem {
  id: string;
  asset_a_id: string;
  asset_b_id: string;
  status: RecommendationStatus;
  recommendation: RecommendationTier;
  final_score: number;
  confidence_label: "HIGH" | "MEDIUM" | "LOW";
  asset_a_snapshot: AssetSnapshot;
  asset_b_snapshot: AssetSnapshot;
  false_positive_signals: FalsePositiveSignal[];
  created_at: string;
  reviewed_at: string | null;
}

export interface MergeRecommendationDetail extends MergeRecommendationListItem {
  score_breakdown: ScoreBreakdown;
  rationale: string;
  review_notes: string | null;
  updated_at: string;
}

export interface ScanResult {
  assets_scanned: number;
  pairs_evaluated: number;
  new_recommendations: number;
  updated_recommendations: number;
  skipped_human_reviewed: number;
  total_pending: number;
}

export interface DedupSummary {
  total_pending: number;
  auto_merge_count: number;
  needs_review_count: number;
  likely_duplicate_count: number;
  accepted_count: number;
  dismissed_count: number;
}
