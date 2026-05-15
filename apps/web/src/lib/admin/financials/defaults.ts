/**
 * HotelVALORA institutional defaults · admin/financials reference page.
 *
 * SCOPE: indicative starting values for European urban hotel
 * underwriting. Operator validates and edits these per asset · these
 * power the default scenario in valuation reports until per-asset
 * data is captured.
 *
 * Source notes (placeholders pending operator review):
 *   - CAPEX/room benchmarks · drawn from Spanish + EU urban
 *     refurbishment market 2023-2026 · sample of 30+ deals
 *   - Financial structure · institutional baseline (hospitality REIT
 *     median LTV / hold periods)
 *   - P&L %s · CoStar STR European hotel benchmark medians by class
 *
 * EVERYTHING IS EDITABLE. When real per-asset data lands, override
 * these defaults at the asset / scenario level via the underwriting
 * engine (services/financial_engine).
 */

// ─── Segmentation taxonomy ────────────────────────────────────────────

/** Hotel size tiers · key-count buckets · drives economies-of-scale. */
export const ROOM_TIERS = [
  { id: "small", label: "0–80 keys", range: [0, 80] as const },
  { id: "medium", label: "80–180 keys", range: [80, 180] as const },
  { id: "large", label: "180+ keys", range: [180, Infinity] as const },
] as const;

export type RoomTierId = (typeof ROOM_TIERS)[number]["id"];

/** Star category · drives positioning + CAPEX intensity. */
export const STAR_CATEGORIES = [
  { id: "3star", label: "3*", positioning: "Midscale" },
  { id: "4star", label: "4*", positioning: "Upscale" },
  { id: "5star", label: "5*", positioning: "Luxury" },
] as const;

export type StarCategoryId = (typeof STAR_CATEGORIES)[number]["id"];

// ─── CAPEX matrix · €/room renovation defaults ────────────────────────

/**
 * CAPEX line item · European urban hotel renovation defaults · €/room.
 * 9 cells per line (3 room tiers × 3 star categories).
 *
 * Convention: refurbishment / soft renovation values · NOT new-build.
 * For new-build, multiply Hard Cost by 4-6×.
 *
 * Source: indicative · operator validates against own deal pipeline.
 */
export interface CapexLine {
  id: string;
  group: "hard" | "soft" | "project";
  label: string;
  description: string;
  /** €/room defaults · matrix [tier][category] */
  defaults: Record<RoomTierId, Record<StarCategoryId, number>>;
}

export const CAPEX_DEFAULTS: CapexLine[] = [
  // ── HARD COST ──
  {
    id: "structure",
    group: "hard",
    label: "Structure",
    description: "Building envelope · structural retrofit · facade · roof",
    defaults: {
      small: { "3star": 8_000, "4star": 14_000, "5star": 28_000 },
      medium: { "3star": 6_500, "4star": 12_000, "5star": 24_000 },
      large: { "3star": 5_500, "4star": 10_000, "5star": 20_000 },
    },
  },
  {
    id: "asset-content",
    group: "hard",
    label: "Asset content",
    description: "Public areas · restaurant build-out · spa · meeting rooms",
    defaults: {
      small: { "3star": 7_000, "4star": 16_000, "5star": 38_000 },
      medium: { "3star": 6_000, "4star": 14_000, "5star": 32_000 },
      large: { "3star": 5_000, "4star": 12_000, "5star": 28_000 },
    },
  },
  {
    id: "mep",
    group: "hard",
    label: "MEP",
    description: "Mechanical · electrical · plumbing · HVAC · life safety",
    defaults: {
      small: { "3star": 9_000, "4star": 16_000, "5star": 28_000 },
      medium: { "3star": 7_500, "4star": 13_500, "5star": 24_000 },
      large: { "3star": 6_500, "4star": 11_500, "5star": 21_000 },
    },
  },
  {
    id: "exterior",
    group: "hard",
    label: "Exterior",
    description: "Landscaping · pool · terraces · parking · access",
    defaults: {
      small: { "3star": 2_500, "4star": 5_000, "5star": 12_000 },
      medium: { "3star": 2_000, "4star": 4_000, "5star": 9_500 },
      large: { "3star": 1_500, "4star": 3_500, "5star": 8_000 },
    },
  },
  // ── SOFT COST ──
  {
    id: "ffe",
    group: "soft",
    label: "FF&E",
    description: "Furniture · fixtures · equipment · room kit · public spaces",
    defaults: {
      small: { "3star": 9_000, "4star": 18_000, "5star": 42_000 },
      medium: { "3star": 8_000, "4star": 15_500, "5star": 36_000 },
      large: { "3star": 7_000, "4star": 13_500, "5star": 32_000 },
    },
  },
  {
    id: "ose",
    group: "soft",
    label: "OS&E",
    description: "Operating supplies · linen · uniforms · china · glassware",
    defaults: {
      small: { "3star": 1_800, "4star": 3_500, "5star": 7_000 },
      medium: { "3star": 1_500, "4star": 3_000, "5star": 6_000 },
      large: { "3star": 1_200, "4star": 2_500, "5star": 5_000 },
    },
  },
  {
    id: "technical",
    group: "soft",
    label: "Technical",
    description: "Architecture · engineering · interior design · M&E consultants",
    defaults: {
      small: { "3star": 3_500, "4star": 6_500, "5star": 14_000 },
      medium: { "3star": 2_800, "4star": 5_500, "5star": 11_500 },
      large: { "3star": 2_500, "4star": 4_500, "5star": 9_500 },
    },
  },
  {
    id: "licensing",
    group: "soft",
    label: "Licensing",
    description: "Permits · municipal fees · environmental · accessibility",
    defaults: {
      small: { "3star": 1_500, "4star": 2_500, "5star": 4_500 },
      medium: { "3star": 1_200, "4star": 2_000, "5star": 4_000 },
      large: { "3star": 1_000, "4star": 1_800, "5star": 3_500 },
    },
  },
  {
    id: "development",
    group: "soft",
    label: "Development management",
    description: "Project manager · cost consultant · construction supervisor",
    defaults: {
      small: { "3star": 2_500, "4star": 5_000, "5star": 11_000 },
      medium: { "3star": 2_000, "4star": 4_000, "5star": 9_000 },
      large: { "3star": 1_800, "4star": 3_500, "5star": 7_500 },
    },
  },
  {
    id: "preopening",
    group: "soft",
    label: "Pre-opening",
    description: "Hiring · training · soft launch · marketing · OPEX bridge",
    defaults: {
      small: { "3star": 2_500, "4star": 5_000, "5star": 12_000 },
      medium: { "3star": 2_000, "4star": 4_500, "5star": 10_000 },
      large: { "3star": 1_800, "4star": 4_000, "5star": 9_000 },
    },
  },
  // ── PROJECT COSTS ──
  {
    id: "contingency",
    group: "project",
    label: "Contingency",
    description: "Hard + soft cost reserve · % of total project cost",
    defaults: {
      small: { "3star": 3_500, "4star": 7_000, "5star": 16_000 },
      medium: { "3star": 3_000, "4star": 6_000, "5star": 13_500 },
      large: { "3star": 2_500, "4star": 5_000, "5star": 12_000 },
    },
  },
  {
    id: "insurance",
    group: "project",
    label: "Insurance",
    description: "Construction all-risk · liability · operator transition cover",
    defaults: {
      small: { "3star": 800, "4star": 1_500, "5star": 3_500 },
      medium: { "3star": 700, "4star": 1_300, "5star": 3_000 },
      large: { "3star": 600, "4star": 1_100, "5star": 2_700 },
    },
  },
];

/** Pre-computed totals per (tier, category) cell · €/room for the full stack. */
export function capexTotalForCell(tier: RoomTierId, category: StarCategoryId): number {
  return CAPEX_DEFAULTS.reduce((sum, line) => sum + line.defaults[tier][category], 0);
}

// ─── Basic financial structure ────────────────────────────────────────

/** Institutional baseline · per-asset assumptions overridden later. */
export interface FinancialStructureLine {
  id: string;
  label: string;
  value: string;
  unit?: string;
  description: string;
}

export const FINANCIAL_STRUCTURE_DEFAULTS: FinancialStructureLine[] = [
  { id: "hold", label: "Hold period", value: "5–7", unit: "years", description: "Standard institutional hospitality hold · matches PE fund cycles" },
  { id: "ltv", label: "Loan-to-Value (LTV)", value: "55–65", unit: "%", description: "Senior debt at acquisition · target leverage for stabilised asset" },
  { id: "ltc", label: "Loan-to-Cost (LTC)", value: "60–70", unit: "%", description: "Construction / refurb financing · higher than LTV during reposition" },
  { id: "rate", label: "All-in cost of debt", value: "Euribor 6M + 250–400", unit: "bps", description: "Senior secured · spread depends on asset quality + sponsor track record" },
  { id: "amort", label: "Amortisation", value: "Interest-only", unit: "5y bullet", description: "Bullet structure · principal at exit · refinance flexibility" },
  { id: "dscr", label: "DSCR covenant", value: "≥ 1.30×", unit: "min", description: "Debt-service coverage ratio · trailing 12-month basis" },
  { id: "exit-cap", label: "Exit cap rate", value: "5.50–7.00", unit: "%", description: "Stabilised yield at exit · varies by location and class · prime urban < secondary" },
  { id: "irr-target", label: "Equity IRR target", value: "15–20", unit: "% net", description: "Levered IRR after fees · institutional minimum for value-add hospitality" },
  { id: "moic", label: "MOIC target", value: "1.8–2.3", unit: "× equity", description: "Multiple on invested capital over hold period" },
  { id: "fees-mgmt", label: "Fund management fee", value: "1.50", unit: "% AUM", description: "Annual · charged on committed capital during investment period · invested capital after" },
  { id: "fees-perf", label: "Carried interest", value: "20", unit: "% above 8% pref", description: "GP carry over preferred return · catch-up + waterfall standard" },
  { id: "transaction-cost", label: "Transaction costs", value: "5.5–7.5", unit: "% of price", description: "Notary · registry · ITP · legal · DD · 1031-equivalent friction in Spain" },
];

// ─── P&L · CoStar STR benchmarks (% of total revenue) ─────────────────

export interface PnlLine {
  id: string;
  group: "revenue" | "departmental" | "undistributed" | "fixed" | "result";
  label: string;
  description: string;
  /** % of total revenue · per star category */
  pct: Record<StarCategoryId, number>;
  /** Whether higher % is "better" for the operator (positive) or worse (negative). */
  polarity: "positive" | "negative" | "neutral";
}

export const PNL_BENCHMARKS: PnlLine[] = [
  // ── Revenue mix ──
  {
    id: "rooms-rev",
    group: "revenue",
    label: "Rooms revenue",
    description: "Accommodation revenue · departmental P&L line 1",
    pct: { "3star": 78, "4star": 68, "5star": 58 },
    polarity: "neutral",
  },
  {
    id: "fb-rev",
    group: "revenue",
    label: "F&B revenue",
    description: "Restaurant · bar · banqueting · room service",
    pct: { "3star": 14, "4star": 22, "5star": 28 },
    polarity: "neutral",
  },
  {
    id: "other-rev",
    group: "revenue",
    label: "Other revenue",
    description: "Spa · parking · resort fees · ancillary",
    pct: { "3star": 8, "4star": 10, "5star": 14 },
    polarity: "neutral",
  },
  // ── Departmental costs ──
  {
    id: "rooms-cost",
    group: "departmental",
    label: "Rooms cost",
    description: "Linen · supplies · housekeeping · laundry · in-room amenities",
    pct: { "3star": 22, "4star": 26, "5star": 30 },
    polarity: "negative",
  },
  {
    id: "fb-cost",
    group: "departmental",
    label: "F&B cost",
    description: "Cost of goods sold · F&B labor · kitchen overhead",
    pct: { "3star": 70, "4star": 72, "5star": 75 },
    polarity: "negative",
  },
  {
    id: "other-cost",
    group: "departmental",
    label: "Other dept. cost",
    description: "Cost of other revenue centers (% of their own revenue)",
    pct: { "3star": 50, "4star": 55, "5star": 60 },
    polarity: "negative",
  },
  // ── Undistributed expenses (% of TOTAL revenue) ──
  {
    id: "admin",
    group: "undistributed",
    label: "Admin & General",
    description: "Front office · finance · HR · IT · legal · executive overhead",
    pct: { "3star": 8, "4star": 9, "5star": 10 },
    polarity: "negative",
  },
  {
    id: "sales-marketing",
    group: "undistributed",
    label: "Sales & Marketing",
    description: "Brand fees · OTA commissions · digital · loyalty · revenue management",
    pct: { "3star": 6, "4star": 7, "5star": 8 },
    polarity: "negative",
  },
  {
    id: "maintenance",
    group: "undistributed",
    label: "Property maintenance",
    description: "Repairs · grounds · POMEC · CapEx maintenance reserve",
    pct: { "3star": 4, "4star": 5, "5star": 6 },
    polarity: "negative",
  },
  {
    id: "utilities",
    group: "undistributed",
    label: "Utilities",
    description: "Electricity · water · gas · waste · sustainability",
    pct: { "3star": 4, "4star": 4, "5star": 4 },
    polarity: "negative",
  },
  // ── Fixed costs ──
  {
    id: "mgmt-fee",
    group: "fixed",
    label: "Base management fee",
    description: "Operator base fee · % of total revenue · prior to incentive",
    pct: { "3star": 2, "4star": 3, "5star": 3 },
    polarity: "negative",
  },
  {
    id: "ipi-tax",
    group: "fixed",
    label: "IBI · property tax",
    description: "Annual property tax · municipal · % of cadastral value approx.",
    pct: { "3star": 1, "4star": 1, "5star": 1 },
    polarity: "negative",
  },
  {
    id: "insurance-op",
    group: "fixed",
    label: "Insurance",
    description: "Property · public liability · business interruption",
    pct: { "3star": 1, "4star": 1, "5star": 1 },
    polarity: "negative",
  },
  // ── Result lines ──
  {
    id: "gop",
    group: "result",
    label: "GOP · Gross Operating Profit",
    description: "Total revenue − departmental cost − undistributed expense",
    pct: { "3star": 38, "4star": 35, "5star": 32 },
    polarity: "positive",
  },
  {
    id: "noi",
    group: "result",
    label: "NOI · Net Operating Income",
    description: "GOP − fixed costs · base for valuation cap-rate math",
    pct: { "3star": 33, "4star": 29, "5star": 27 },
    polarity: "positive",
  },
  {
    id: "ebitda",
    group: "result",
    label: "EBITDA after FF&E reserve",
    description: "NOI − 4% FF&E replacement reserve · cash-yield base",
    pct: { "3star": 29, "4star": 25, "5star": 23 },
    polarity: "positive",
  },
];
