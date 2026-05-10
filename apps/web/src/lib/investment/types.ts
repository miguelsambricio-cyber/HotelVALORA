// Investment criteria — canonical contract.
//
// This is the engine that defines what a user wants to acquire. The
// match engine reads these criteria to score hotels (🟢/🟡/🔴), and
// every analytical surface (Executive Summary, CompSet, Underwriting,
// Deal Screening) consumes them to highlight fit / mismatch.
//
// v1: shape is captured + persisted. Match engine is a stub. v2 wires
// real scoring (location proximity, size band, facility intersection,
// CAPEX bracket, financial hurdle).

// ── Asset / property domain ────────────────────────────────────────────────

export type AssetType = "hotel" | "hotel-project" | "tourist-apartment";

export type AssetClass = "midscale" | "upscale" | "upper-upscale" | "luxury";

export type OwnershipInterest = "freehold" | "leasehold" | "mixed";

export type BrandManagement = "unencumbered" | "branded" | "owner-operated";

export type YearBuildBand = "any" | "after-2000" | "after-2010" | "after-2020";

export type TernaryYesNo = "yes" | "no";

// ── CAPEX taxonomy (mirrors Excel underwriting workbook structure) ─────────

export type CapexUnit = "total" | "per_room" | "per_m2" | "percent";

export interface CapexLineItem {
  id: string;
  label: string;
  defaultUnit: CapexUnit;
  availableUnits: readonly CapexUnit[];
}

export interface CapexGroup {
  id: string;
  label: string;
  /** Material symbol name — surfaced as a lucide-react fallback in UI */
  icon?: string;
  defaultUnit: CapexUnit;
  availableUnits: readonly CapexUnit[];
  children: CapexLineItem[];
}

export interface CapexValueEntry {
  /** Numeric amount. `null` = field empty (not yet specified) */
  value: number | null;
  unit: CapexUnit;
}

export type CapexValueMap = Record<string, CapexValueEntry>;

export type CapexMode = "basico" | "personalizado";

// ── Facilities ─────────────────────────────────────────────────────────────

export type FacilityId =
  | "bar-cafe"
  | "restaurant"
  | "rooftop-bar"
  | "meeting-events"
  | "parking"
  | "gym"
  | "spa-wellness"
  | "pool";

// ── Renders / AI imagery ───────────────────────────────────────────────────

export interface RenderRow {
  id: string;
  index: number;
  area: string; // Fachada / Lobby / Room / F&B
  type: string; // Moderna / Vanguard / Clásico ...
  view: string; // Portada / Final / Reporte ...
}

// ── Coverage tree (markets the platform supports) ──────────────────────────

export interface CoverageNode {
  id: string;
  label: string;
  /** Optional emoji / flag character for top-level country nodes */
  flag?: string;
  children?: CoverageNode[];
}

// ── Top-level criteria store ───────────────────────────────────────────────

export interface InvestmentCriteria {
  // MyProperty Parameters
  assetType: AssetType;
  starCategory: number; // 1..5
  assetClass: AssetClass;

  // Capacity & Operation
  minRooms: number;
  maxRooms: number;
  daysOpenYearly: number;

  // Location Targets
  country: string;
  marketTarget: string;
  submarket: string;
  centroHistorico: boolean;
  targetLocationScore: number; // 0..10
  comfortScoreRenovation: number; // 0..10
  forRenovation: TernaryYesNo;

  // Property Specs
  distanceToCenterKm: number;
  yearToBuild: YearBuildBand;
  grossBuildingM2: number;
  lotSizeM2: number;
  ownershipInterest: OwnershipInterest;
  brandManagement: BrandManagement;

  // CAPEX
  capexMode: CapexMode;
  capexValues: CapexValueMap;

  // Renders
  rendersEnabled: boolean;
  autoSelectAi: boolean;
  renderRows: RenderRow[];

  // Facilities (MyProperty + CompSet)
  myPropertyFacilities: FacilityId[];
  compsetFacilities: FacilityId[];
  compsetDistanceKm: number;
}

// ── Match engine (v1 stub — see match-engine.ts) ───────────────────────────

export type MatchTier = "strong" | "partial" | "weak";

export type MatchCategory =
  | "location"
  | "size"
  | "facilities"
  | "financials"
  | "capex"
  | "strategy";

export interface CategoryMatch {
  category: MatchCategory;
  /** 0..1 normalised score */
  score: number;
  tier: MatchTier;
  /** Optional human-readable reason ("3 of 4 required facilities present") */
  reason?: string;
}

export interface MatchResult {
  overall: MatchTier;
  /** Weighted average across categories, 0..1 */
  overallScore: number;
  byCategory: CategoryMatch[];
}

// ── Investment top tab (Hotel Asset / Hotel Market / Hotel Value) ──────────

export type InvestmentTab = "asset" | "market" | "value";
