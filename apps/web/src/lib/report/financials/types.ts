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
  | "exp-insurance"
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

// ── Facility profile · drives facility-aware ratio adjustments ─────────────

/**
 * What the hotel actually has · drives the facility-aware rule
 * (drop revenue lines for absent services, F&B uplift per restaurant above
 * the first). Populated by `applyFacilityAwareRule` from canonical data:
 * `restaurants_count` + `amenities.{meet, spa, parking, bar, rooftop}` +
 * `hotel_type`.
 */
export interface FacilityProfile {
  /** True when the hotel has ANY F&B presence (restaurant, bar, rooftop). */
  hasFB: boolean;
  /** Explicit Booking-derived count · null when no signal. */
  restaurantsCount: number | null;
  /** True when meeting/banquet/conference/event space exists. */
  hasMICE: boolean;
  /** True when spa/wellness exists. */
  hasSpa: boolean;
  /** True when on-site parking exists (drives parking + rentals line). */
  hasParking: boolean;
  /** Geographic typology · drives the F&B uplift factor per extra outlet. */
  hotelType: "urban" | "mixed" | "resort";
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
    expInsurance: number;
    /**
     * FF&E reserve baseline (% of total revenue). Operator assumption, NOT
     * CoStar. NOTE: `computePL` no longer reads this constant for the EBITDA
     * after-replacement line — it derives the reserve per-year from the
     * CAPEX-driven ramp (`ffeReservePct`, see `ffe-reserve.ts`). Retained for
     * backward compatibility / display defaults.
     */
    expFfeReserve: number;
  };

  /** EBITDA margin target shown in the dark hero card (informational) */
  ebitdaStabilizedTarget: number; // ratio 0..1
  /** Staff cost share shown in the dark hero card (informational) */
  staffCostShare: number; // ratio 0..1

  /** Operating days per year (typically 365) */
  daysInYear: number;

  /**
   * Facility profile of the underlying asset · populated by
   * `applyFacilityAwareRule`. Optional for backward compatibility with
   * callers that build assumptions outside the canonical pipeline (mock
   * pages, tests). When present, `pl-table.tsx` collapses rows whose
   * ratio is 0 (services the hotel doesn't have).
   */
  facilityProfile?: FacilityProfile;

  /**
   * CAPEX signal (D1/D2) · drives the FF&E reserve ramp in `computePL`.
   * Set by `buildFinancialsSlice` from canonical (new build / recent
   * renovation / operator-set). Threaded on the assumption store so client
   * callers of `computePL(assumptions)` pick it up without extra args.
   * Absent → false → flat 4% reserve (stabilised asset).
   */
  hasCapex?: boolean;
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
    /** EBITDA pre-replacement (headline) = GOP − mgmt − tax − insurance. */
    ebitda: FiveYears;
    /** EBITDA after replacement (valuation) = ebitda − FF&E reserve (ramp). */
    ebitdaAfterReplacement: FiveYears;
    ebitdaMargin: FiveYears; // ratio 0..1 · on pre-replacement EBITDA
  };
}

// ── Tier (re-exported from the canonical auth contract) ────────────────────
//
// Tier values are the same as `UserTier` in `@/lib/auth` — kept under the
// `Tier` alias here for backwards compatibility with existing imports.

export type Tier = "free" | "pro" | "premium" | "team" | "enterprise";
