// Financials — type contracts.
//
// All UI components consume the types defined here. Calculations live in
// `calculations.ts` (pure functions) so the UI never reaches into raw arrays.
// The shape is designed for future ingestion of CoStar datasets keyed by
// (country, market, submarket, class) — the `PLAssumptions` interface maps
// 1:1 onto a CoStar row plus the operator's Year-1 base.

import type { Currency } from "./currency";
import type { UnderwritingScenario } from "@/lib/underwriting/scenario";

// ── USALI structure ─────────────────────────────────────────────────────────

export type PLLineItemId =
  // Room statistics — informational rows above operating revenue
  | "rooms-count"
  | "occupancy"
  | "adr"
  | "revpar"
  // Operating revenue
  | "rev-rooms"
  | "rev-fb"
  | "rev-meeting"
  | "rev-spa"
  | "rev-parking-other"
  // Departmental expenses
  | "exp-rooms"
  | "exp-fb"
  | "exp-other-dept"
  // Undistributed expenses
  | "exp-admin"
  | "exp-sales-marketing"
  | "exp-property-maint"
  | "exp-utilities"
  // Non-operating charges
  | "exp-mgmt-fee"
  | "exp-property-tax"
  | "exp-ffe-reserve";

export type PLSectionId =
  | "room-statistics"
  | "operating-revenue"
  | "departmental-expenses"
  | "undistributed-expenses"
  | "non-operating-charges";

export type PLResultId = "total-revenue" | "gop" | "ebitda";

/** How the cell value is formatted on render. */
export type PLValueKind = "currency" | "percent" | "absolute";

/** Visual emphasis applied to a row. */
export type PLRowWeight = "regular" | "bold";

/** Result-row styling preset. */
export type PLResultVariant = "total" | "gop" | "ebitda";

// ── Per-line-item config (drives the UI without baking in values) ───────────

export interface PLLineItemConfig {
  id: PLLineItemId;
  label: string;
  weight?: PLRowWeight;
  /** Render a +x.x% pill next to year cells (auto YoY delta) */
  showYearDelta?: boolean;
  /** Format of the editable assumption cell. `null` → no assumption cell */
  assumptionKind: PLValueKind | null;
  /**
   * The denominator label shown next to the assumption value (small text).
   * Helps the reader understand what the % refers to ("% rooms rev",
   * "% total rev", etc.). Omit for currency / absolute assumptions.
   */
  assumptionDenominator?: string;
  /** Whether the user can edit this assumption (Year-1 driver) */
  editableAssumption: boolean;
  /** Whether the Year-1 cell itself is editable (overrides the derived value) */
  editableYear1: boolean;
  /** Format of the year cells */
  yearKind: PLValueKind;
}

export interface PLSectionConfig {
  id: PLSectionId;
  label: string;
  lineItems: PLLineItemConfig[];
  /** Optional emphasized result row at the end of the section */
  result?: {
    id: PLResultId;
    label: string;
    variant: PLResultVariant;
    /** Render a small "% Margin" sub-row beneath (used for EBITDA) */
    showMargin?: boolean;
  };
}

// ── Assumptions store ───────────────────────────────────────────────────────

/**
 * Central assumption store. Future shape — `country`/`market`/`submarket`/
 * `class` will be added when the CoStar ingestion ships, plus an `Excel
 * mapping` table that turns a row into this struct. For v1 the values are
 * mocked; user edits go straight into local React state.
 */
export interface PLAssumptions {
  currency: Currency;
  rooms: number;

  // ── Year-1 base ──
  occupancyYear1: number; // ratio 0..1
  adrYear1: number; // currency unit

  // ── Year-over-year drivers ──
  /**
   * Active underwriting scenario. The calc layer looks up
   * `SCENARIO_PRESETS[activeScenario]` (in `assumptions.ts`) to resolve
   * occupancy deltas + ADR growth per year. Switching this single field
   * recomputes occupancy, ADR, RevPAR, revenue, GOP, EBITDA, and margins
   * across all 5 years.
   */
  activeScenario: UnderwritingScenario;
  /**
   * Inflation buckets — wired into the model when an expense line is priced
   * in fixed currency (future use). v1 keeps ratios constant across years
   * so this card is part of the snapshot but doesn't yet drive the table.
   */
  expenseInflation: { payroll: number; utilities: number; other: number };

  // ── Per-line-item Year-1 ratios (constant across years in v1) ──
  ratios: {
    // Operating revenue (% of total revenue) — `revRooms` is derived
    revFB: number;
    revMeeting: number;
    revSpa: number;
    revParkingOther: number;
    // Departmental expenses (% of department revenue)
    expRooms: number;
    expFB: number;
    expOtherDept: number;
    // Undistributed expenses (% of total revenue)
    expAdmin: number;
    expSalesMarketing: number;
    expPropertyMaint: number;
    expUtilities: number;
    // Non-operating charges (% of total revenue)
    expMgmtFee: number;
    expPropertyTax: number;
    expFfeReserve: number;
  };

  /** EBITDA margin target shown in the dark hero card (informational) */
  ebitdaStabilizedTarget: number; // ratio 0..1
  /** Staff cost share shown in the dark hero card (informational) */
  staffCostShare: number; // ratio 0..1

  /** Operating days per year (typically 365) */
  daysInYear: number;
}

// ── Computed shape returned by `computePL(assumptions, scenario)` ──────────

export type FiveYears = readonly [number, number, number, number, number];

export interface PLComputed {
  /** 5-year array per line item — values respect the line's `yearKind` */
  lineItems: Record<PLLineItemId, FiveYears>;
  /** Aggregates */
  results: {
    totalRevenue: FiveYears;
    gop: FiveYears;
    ebitda: FiveYears;
    ebitdaMargin: FiveYears; // ratio 0..1
  };
}

// ── Tier (mirrored from use-tier.ts to avoid circular imports) ──────────────

export type Tier = "FREE" | "PRO" | "PREMIUM";
