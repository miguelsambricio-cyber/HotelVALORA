/**
 * Types for the Market Intelligence Terminal.
 *
 * Shaped 1:1 against migration 0006 so the Phase 3 swap to a Supabase
 * read is mechanical:
 *
 *   public.market_news         → NewsItem
 *   public.hotel_transactions  → ExtractedDeal
 *   public.hotel_projects      → ExtractedProject
 *   public.news_entities       → EntityMention
 *   public.news_tags           → tags string[] on NewsItem
 *   public.news_ingestion_runs → SourceCoverageEntry rollup
 *
 * All ENUMs mirror their SQL counterparts. Adding a value here must be
 * paired with a migration that extends the enum (and a Supabase MCP
 * apply once the user authorizes the schema move).
 */

import type { SignalLevel } from "@/lib/admin/dashboard";

/** Mirror of `public.news_category` enum. */
export type NewsCategory =
  | "acquisition"
  | "sale"
  | "joint_venture"
  | "development"
  | "refinancing"
  | "rebranding"
  | "operator_change"
  | "branded_residences"
  | "flex_living"
  | "pipeline_announcement"
  | "distress"
  | "investment"
  | "other";

/** Mirror of `public.hotel_segment` enum. */
export type HotelSegment =
  | "luxury"
  | "upper_upscale"
  | "upscale"
  | "upper_midscale"
  | "midscale"
  | "economy"
  | "lifestyle"
  | "resort"
  | "boutique"
  | "mixed_use"
  | "serviced_apartments"
  | "unknown";

/** Mirror of `public.entity_role` enum. */
export type EntityRole =
  | "buyer"
  | "seller"
  | "investor"
  | "operator"
  | "broker"
  | "lender"
  | "developer"
  | "previous_operator"
  | "new_operator"
  | "partner"
  | "mentioned";

/** Coarse brand affiliation for institutional segmentation. */
export type BrandAffiliation = "branded" | "soft_brand" | "independent" | "unknown";

/** Display contract for category pills — keeps category styling consistent across panels. */
export interface CategoryVisual {
  label: string;
  signal: SignalLevel;
}

export const CATEGORY_VISUAL: Record<NewsCategory, CategoryVisual> = {
  acquisition:            { label: "Acquisition",         signal: "ok"      },
  sale:                   { label: "Sale",                signal: "ok"      },
  joint_venture:          { label: "JV",                  signal: "ok"      },
  development:            { label: "Development",         signal: "warn"    },
  refinancing:            { label: "Refinancing",         signal: "warn"    },
  rebranding:             { label: "Rebranding",          signal: "neutral" },
  operator_change:        { label: "Operator Change",     signal: "neutral" },
  branded_residences:     { label: "Branded Res",         signal: "neutral" },
  flex_living:            { label: "Flex Living",         signal: "neutral" },
  pipeline_announcement:  { label: "Pipeline",            signal: "warn"    },
  distress:               { label: "Distress",            signal: "error"   },
  investment:             { label: "Investment",          signal: "ok"      },
  other:                  { label: "Other",               signal: "neutral" },
};

/** Entity reference — link to investor / operator / hotel / market. */
export interface EntityMention {
  /** Polymorphic kind. */
  kind: "investor" | "operator" | "hotel" | "market";
  /** Resolved canonical id when known (UUID in real DB; slug for mock). */
  id: string | null;
  /** Literal mention from the article (pre-resolution useful for forensic UI). */
  rawMention: string;
  /** Role this entity plays in the news event. */
  role: EntityRole;
  /** 0..1 — extractor confidence. */
  confidence: number;
}

/** Top-level news item — the canonical record surfaced in the terminal. */
export interface NewsItem {
  /** market_news.id (UUID). Slug in mock. */
  id: string;
  /** market_news.source_id reference — we surface the slug for display. */
  sourceSlug: string;
  /** Display name of the source ("Hosteltur"). */
  sourceName: string;
  /** market_news.title. */
  title: string;
  /** market_news.summary — RSS-derived. */
  summary: string | null;
  /** market_news.url — the original source URL. NEVER altered. */
  url: string;
  /** market_news.published_at. */
  publishedAt: string;
  /** market_news.country — ISO 3166-1 alpha-2. */
  country: string | null;
  /** market_news.market — submarket-agnostic market identifier (e.g., "Madrid Centro"). */
  market: string | null;
  /** market_news.city — city display name. */
  city: string | null;
  /** market_news.category. */
  category: NewsCategory;
  /** market_news.hotel_segment. */
  hotelSegment: HotelSegment | null;
  /** Coarse brand affiliation surfaced for segmentation. */
  brandAffiliation: BrandAffiliation;
  /** market_news.language. */
  language: string;
  /** Free-form tags from public.news_tags. */
  tags: string[];
  /** Linked entity mentions. */
  entities: EntityMention[];
  /** 0..100 institutional-relevance score (combines category × magnitude × source reliability). */
  relevanceScore: number;
  /** Operator-facing relevance band. */
  relevanceBand: "critical" | "high" | "standard" | "low";
}

/** Extracted hotel-transaction record, joined from `public.hotel_transactions`. */
export interface ExtractedDeal {
  id: string;
  newsId: string;
  newsTitle: string;
  sourceSlug: string;
  category: NewsCategory;
  /** Asset name when disclosed. */
  assetName: string | null;
  /** Geo. */
  country: string | null;
  city: string | null;
  market: string | null;
  /** Room count (>0). */
  rooms: number | null;
  /** Transaction price in EUR. */
  priceEur: number | null;
  /** Price-per-key in EUR. */
  pricePerKeyEur: number | null;
  /** Cap rate (percent — e.g., 5.5 for 5.5%). */
  capRate: number | null;
  /** Closing date when announced. */
  closedAt: string | null;
  /** Announcement date when distinct from close. */
  announcedAt: string | null;
  /** Buyer entity (resolved canonical name). */
  buyer: string | null;
  /** Seller entity. */
  seller: string | null;
  /** Operator (resolved). */
  operator: string | null;
  /** Brand affiliation. */
  brand: string | null;
  /** Buy-side advisor when disclosed. */
  advisorBuy: string | null;
  /** Sell-side advisor when disclosed. */
  advisorSell: string | null;
  /** Original source URL for institutional traceability. */
  sourceUrl: string;
  /** Notes — operator-facing context. */
  notes: string | null;
}

/** Extracted hotel-project record, joined from `public.hotel_projects`. */
export interface ExtractedProject {
  id: string;
  newsId: string;
  newsTitle: string;
  sourceSlug: string;
  category: NewsCategory;
  projectName: string | null;
  country: string | null;
  city: string | null;
  market: string | null;
  rooms: number | null;
  /** Estimated opening date (yyyy-MM). */
  estimatedOpening: string | null;
  developer: string | null;
  operator: string | null;
  brand: string | null;
  /** Capex in EUR. */
  capexEur: number | null;
  sourceUrl: string;
  notes: string | null;
}

/** Category-breakdown row for the donut + bar surface. */
export interface CategoryBreakdownRow {
  category: NewsCategory;
  count: number;
  share: number;
}

/** Entity-mentions rollup for the trending-entities panel. */
export interface EntityMentionsRow {
  kind: "investor" | "operator";
  name: string;
  mentions7d: number;
  role: EntityRole;
  /** Last seen ISO. */
  lastSeenAt: string;
  /** Trend versus prior 7d ("+12" or "—"). */
  trend: string;
}

/** Per-source coverage entry for the source-coverage matrix. */
export interface SourceCoverageRow {
  sourceSlug: string;
  sourceName: string;
  region: string;
  articles7d: number;
  articlesToday: number;
  signal: SignalLevel;
  /** Last successful ingest ISO. */
  lastRunAt: string | null;
  /** Status label (Operational · Degraded · Awaiting · Not Configured). */
  statusLabel: string;
}

/** Volume KPIs — the strip at the top of the terminal. */
export interface VolumeKpi {
  id: string;
  label: string;
  value: string;
  subline: string;
  signal: SignalLevel;
  trend?: string;
}

/** High-relevance alert — items the operator should look at first. */
export interface RelevanceAlert {
  id: string;
  newsId: string;
  title: string;
  sourceSlug: string;
  category: NewsCategory;
  band: "critical" | "high";
  publishedAt: string;
  reason: string;
  url: string;
}

/** Aggregate report bundle for the terminal. */
export interface IntelligenceTerminalData {
  volumeKpis: VolumeKpi[];
  recentNews: NewsItem[];
  extractedDeals: ExtractedDeal[];
  extractedProjects: ExtractedProject[];
  categoryBreakdown: CategoryBreakdownRow[];
  entityMentions: EntityMentionsRow[];
  sourceCoverage: SourceCoverageRow[];
  relevanceAlerts: RelevanceAlert[];
}
