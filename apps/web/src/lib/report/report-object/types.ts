import type { CanonicalHotelRow, MarketKpiBundle } from "@/lib/report/canonical-reader";
import type { UnderwritingRunResult } from "@/lib/report/underwriting-runner";
import type { PLAssumptions } from "@/lib/report/financials/types";

/**
 * Unified Report Object · single source of truth for every /report/*
 * surface. Built ONCE at the server-component layer from a canonical_id
 * + the admin financials defaults · then every section consumes its own
 * slice of this object.
 *
 * Design principles (per operator directive 2026-05-25):
 *   1. Single canonical_id flows through Exec Summary · Asset Analysis ·
 *      CompSet · Market Overview · Financials · Underwriting · CAPEX.
 *   2. CAPEX + financial structure + debt + P&L benchmarks come from
 *      `apps/web/src/lib/admin/financials/defaults.ts` (admin master) ·
 *      canonical hotel only provides AUXILIARY inputs (rooms · chain_scale
 *      · year_opened · year_renovated · star_category · submarket).
 *   3. Transactions + Projects scope is MARKET-LEVEL with provenance trace
 *      (market → city → fallback).
 *   4. Tier gating lives on the object itself · each section carries
 *      `visibility: 'visible' | 'gated' | 'hidden'` per the FREE/PRO/PREMIUM matrix.
 *
 * Object shape is intentionally additive · existing canonical mappers
 * (`mapCanonicalToExecutiveSummary` etc.) consume the same hotel +
 * marketKpi as before · so they continue to work without modification.
 */

// ─── Tier model ─────────────────────────────────────────────────────────────

export type ReportTier = "free" | "pro" | "premium";

export type SectionVisibility = "visible" | "gated" | "hidden";
/** "gated" = section shown with LockedGate overlay · upgrade CTA visible.
 *  "hidden" = section not rendered at all (FREE never sees Underwriting).
 *  "visible" = normal render.
 */

export interface SectionAccess {
  visible: boolean;            // page renders any content (vs blank)
  gated: boolean;              // page wraps content in LockedGate
  editable: boolean;           // edit affordances are interactive (premium-only)
}

export interface TierMatrix {
  executiveSummary: SectionAccess;
  assetAnalysis: SectionAccess;
  competitiveSet: SectionAccess;
  marketOverview: SectionAccess;
  marketDynamics: SectionAccess;
  marketProjects: SectionAccess;
  marketTransactions: SectionAccess;
  financialsPL: SectionAccess;
  underwriting: SectionAccess;
  capex: SectionAccess;
  financialStructure: SectionAccess;
  exitScenarios: SectionAccess;
  renders: SectionAccess;
}

// ─── Section-specific data slices ──────────────────────────────────────────

/** Source-of-data provenance · which level of the geo ladder answered. */
export type GeoScope = "submarket" | "market" | "city" | "country" | "baseline";

export interface SectionProvenance {
  source: string;       // e.g. "CoStar submarket · Retiro" | "admin defaults · Madrid 4star medium"
  scope?: GeoScope;
  fallback_used?: string[];   // ["submarket→market", "rooms heuristic"]
  generated_at: string;       // ISO timestamp
}

/** P&L assumptions snapshot · derived from canonical + admin benchmarks. */
export interface FinancialsSlice {
  assumptions: PLAssumptions;
  provenance: SectionProvenance;
  /** X4 · CoStar template provenance level for the source pill. */
  source_level?: "submarket" | "national" | "derived" | "no_data";
  /** X4/X5 · true when real CoStar/derived ratios resolved (not hard default). */
  costar_resolved?: boolean;
}

/** Underwriting scenario inputs · derived from canonical + admin financial structure.
 *  Shape mirrors the existing `UnderwritingInputs` from `@/lib/underwriting/types`
 *  but we keep it typed-loose here to avoid a hard import dependency at the
 *  type-file level (the type lives in the underwriting engine package). */
export interface UnderwritingSlice {
  // `inputs` carries an UnderwritingInputs · imported by callers that need it.
  inputs: unknown;
  // Convenience flat view for read-only surfaces that don't run the engine
  summary: {
    rooms: number;
    total_sqm: number;
    asking_price_eur: number;
    cap_rate_pct: number;
    project_irr_pct: number | null;
    equity_irr_pct: number | null;
    moic: number | null;
  };
  provenance: SectionProvenance;
}

/** CAPEX schedule · derived from admin CAPEX matrix using hotel's room
 *  tier (small/medium/large) x star category (3-star / 4-star / 5-star). */
export interface CapexLineSnapshot {
  id: string;
  group: "hard" | "soft" | "project";
  label: string;
  description: string;
  per_room_eur: number;
  total_eur: number;
}
export interface CapexSlice {
  lines: CapexLineSnapshot[];
  totals: {
    hard_eur: number;
    soft_eur: number;
    project_eur: number;
    total_eur: number;
    per_room_eur: number;
  };
  room_tier: "small" | "medium" | "large";
  star_category: "3star" | "4star" | "5star";
  provenance: SectionProvenance;
}

/** Market-level lists (Transactions / Projects) · per operator directive
 *  these are MARKET-LEVEL (not submarket) with provenance trace. */
export interface MarketListSlice<T> {
  items: T[];
  scope: GeoScope;
  provenance: SectionProvenance;
}

// ─── The unified object ────────────────────────────────────────────────────

export interface ReportObject {
  /** Stable identity · primary key into hotel_canonical. */
  canonical_id: string;

  /** Raw canonical row from Supabase · already loaded with market_name +
   *  submarket_name joined. */
  hotel: CanonicalHotelRow;

  /** Resolved 6-level KPI bundle for this hotel's submarket/market. */
  marketKpi: MarketKpiBundle;

  /** Cap-rate engine output · null when no category / market resolved. */
  engineRun: UnderwritingRunResult | null;

  // Section slices · derived on build · all are READ-ONLY snapshots
  financials: FinancialsSlice;
  underwriting: UnderwritingSlice;
  capex: CapexSlice;

  // Tier gating · pre-computed per the current viewer's tier
  tier: ReportTier;
  access: TierMatrix;

  meta: {
    schema_version: 1;
    generated_at: string;
    canonical_loaded_at: string;
    admin_defaults_version: string;     // git-sha-like opaque token to invalidate caches
  };
}

// ─── Build options ─────────────────────────────────────────────────────────

export interface BuildReportOptions {
  /** Tier of the requesting viewer · drives the access matrix. Defaults
   *  to 'premium' for showcase/demo paths · production should always
   *  pass the authenticated user's tier explicitly. */
  tier?: ReportTier;
  /** Override admin defaults · used by tests · should be undefined in prod. */
  adminDefaultsOverride?: unknown;
}

// ─── Section access · the tier matrix ──────────────────────────────────────

const HIDDEN: SectionAccess = { visible: false, gated: false, editable: false };
const GATED: SectionAccess = { visible: true, gated: true, editable: false };
const READONLY: SectionAccess = { visible: true, gated: false, editable: false };
const EDITABLE: SectionAccess = { visible: true, gated: false, editable: true };

/** Resolve the section visibility matrix per the operator's spec:
 *
 *  FREE
 *    + Executive Summary             visible · gated (CTA upgrade)
 *    + everything else               hidden
 *
 *  PRO
 *    + Executive Summary             read-only
 *    + Asset Analysis                read-only (NO edit)
 *    + Competitive Set               read-only
 *    + Market Overview               read-only
 *    + Market Dynamics               read-only
 *    + Market Projects               read-only
 *    + Market Transactions           read-only
 *    + Financials (P&L)              read-only
 *    + Underwriting                  read-only
 *    - CAPEX                         hidden (premium-only detail)
 *    - Financial Structure           hidden (premium-only)
 *    - Exit Scenarios                hidden
 *    - Renders                       hidden
 *
 *  PREMIUM
 *    + everything                    editable
 */
export function tierMatrixFor(tier: ReportTier): TierMatrix {
  switch (tier) {
    case "free":
      return {
        executiveSummary: GATED,           // visible · with upgrade prompt
        assetAnalysis: HIDDEN,
        competitiveSet: HIDDEN,
        marketOverview: HIDDEN,
        marketDynamics: HIDDEN,
        marketProjects: HIDDEN,
        marketTransactions: HIDDEN,
        financialsPL: HIDDEN,
        underwriting: HIDDEN,
        capex: HIDDEN,
        financialStructure: HIDDEN,
        exitScenarios: HIDDEN,
        renders: HIDDEN,
      };
    case "pro":
      return {
        executiveSummary: READONLY,
        assetAnalysis: READONLY,
        competitiveSet: READONLY,
        marketOverview: READONLY,
        marketDynamics: READONLY,
        marketProjects: READONLY,
        marketTransactions: READONLY,
        financialsPL: READONLY,
        underwriting: READONLY,
        capex: HIDDEN,                     // premium-only detail
        financialStructure: HIDDEN,
        exitScenarios: HIDDEN,
        renders: HIDDEN,
      };
    case "premium":
    default:
      return {
        executiveSummary: EDITABLE,
        assetAnalysis: EDITABLE,
        competitiveSet: EDITABLE,
        marketOverview: EDITABLE,
        marketDynamics: EDITABLE,
        marketProjects: EDITABLE,
        marketTransactions: EDITABLE,
        financialsPL: EDITABLE,
        underwriting: EDITABLE,
        capex: EDITABLE,
        financialStructure: EDITABLE,
        exitScenarios: EDITABLE,
        renders: EDITABLE,
      };
  }
}
