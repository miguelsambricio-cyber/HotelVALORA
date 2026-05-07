export interface ReviewSummary {
  open_conflicts: number;
  low_confidence_aliases: number;
  low_confidence_threshold: number;
  pending_merge_recommendations: number;
}

export interface AliasConflict {
  id: string;
  alias_key: string;
  alias_text: string;
  conflicting_asset_ids: string[];
  status: string;
  detected_at: string;
  resolved_at: string | null;
}

export interface LowConfidenceAlias {
  id: string;
  asset_id: string | null;
  alias_text: string;
  alias_key: string;
  alias_type: string;
  language: string | null;
  is_active: boolean;
  is_manual_override: boolean;
  confidence: number | null;
  valid_from: string | null;
  valid_to: string | null;
}

export interface PagedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

export interface SingleResponse<T> {
  data: T;
}
