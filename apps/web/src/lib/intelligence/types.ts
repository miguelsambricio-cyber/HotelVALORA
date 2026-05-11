import type { Database } from "@/lib/supabase/types";

export type NewsCategory = Database["public"]["Enums"]["news_category"];
export type IngestionSourceKind =
  Database["public"]["Enums"]["ingestion_source_kind"];
export type IngestionStatus = Database["public"]["Enums"]["ingestion_status"];

export interface SourceRow {
  id: string;
  slug: string;
  name: string;
  base_url: string;
  ingestion_kind: IngestionSourceKind;
  rss_url: string | null;
  api_endpoint: string | null;
  scrape_selector: Record<string, unknown> | null;
  region: string;
  language: string;
  reliability_score: number | null;
  enabled: boolean;
}

/**
 * Raw item produced by a fetcher BEFORE normalisation.
 * Fetchers don't touch the database; the orchestrator does.
 */
export interface RawNewsItem {
  source_id: string;
  source_slug: string;
  title: string;
  url: string;
  summary?: string;
  body?: string;
  published_at?: string;
  language?: string;
  region?: string;
  raw?: Record<string, unknown>;
}

/**
 * Normalised item ready for upsert into market_news.
 * canonical_url + url_hash are derived; category is the regex-pass guess.
 */
export interface NormalisedNewsItem extends RawNewsItem {
  canonical_url: string;
  url_hash: string;
  content_hash: string;
  category: NewsCategory;
  tags: string[];
}

/**
 * Per-source ingestion outcome — written to news_ingestion_runs.
 */
export interface IngestionRunResult {
  source_id: string;
  source_slug: string;
  status: IngestionStatus;
  items_seen: number;
  items_inserted: number;
  items_updated: number;
  items_skipped: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestionBatchResult {
  started_at: string;
  completed_at: string;
  duration_ms: number;
  per_source: IngestionRunResult[];
  totals: {
    sources_attempted: number;
    sources_succeeded: number;
    sources_failed: number;
    items_seen: number;
    items_inserted: number;
    items_updated: number;
  };
}
