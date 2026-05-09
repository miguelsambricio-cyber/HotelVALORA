// Market Dynamics data contract (Stitch parity).
//
// Each chart card carries its OWN 4-axis filter state (Scope × Class × KPI ×
// Horizon). The page renders 8 cards initialised from CHART_PRESETS — the
// reader can override any chart's filters individually.
//
// Designed to be replaced by the future market intelligence service. The mock
// generator (`getDynamicsChart`) returns a deterministic series for any filter
// combination so the UI never reaches into raw arrays.

// ── Filter axes ─────────────────────────────────────────────────────────────

export type DynamicsScope =
  | "country"
  | "market"
  | "submarket"
  | "compset"
  | "forecast";

/** Class buckets — grouped per Stitch (4 options, not 6 individual classes). */
export type DynamicsClass =
  | "general"
  | "upper-luxury"
  | "upscale-midscale"
  | "midscale-basic";

export type DynamicsKpi =
  | "occupancy"
  | "adr"
  | "revpar"
  | "supply-rn"
  | "demand-rn";

export type DynamicsHorizon = "12m" | "3y" | "5y" | "10y";

export interface DynamicsFilterState {
  scope: DynamicsScope;
  class: DynamicsClass;
  kpi: DynamicsKpi;
  horizon: DynamicsHorizon;
}

export interface DynamicsFilterOption<T extends string = string> {
  id: T;
  label: string;
}

// Spanish/Portuguese labels matching the Stitch dropdowns verbatim.
export const SCOPE_OPTIONS: DynamicsFilterOption<DynamicsScope>[] = [
  { id: "country", label: "Pais" },
  { id: "market", label: "Mercado" },
  { id: "submarket", label: "Submercado" },
  { id: "compset", label: "Compset" },
  { id: "forecast", label: "Forecast" },
];

export const CLASS_OPTIONS: DynamicsFilterOption<DynamicsClass>[] = [
  { id: "general", label: "General" },
  { id: "upper-luxury", label: "Upper Upscale & Luxury" },
  { id: "upscale-midscale", label: "Upscale & Upper Midscale" },
  { id: "midscale-basic", label: "Midscale & Basic" },
];

export const KPI_OPTIONS: DynamicsFilterOption<DynamicsKpi>[] = [
  { id: "occupancy", label: "Ocupacion" },
  { id: "adr", label: "ADR" },
  { id: "revpar", label: "RevPAR" },
  { id: "supply-rn", label: "Oferta RN" },
  { id: "demand-rn", label: "Demanda RN" },
];

export const HORIZON_OPTIONS: DynamicsFilterOption<DynamicsHorizon>[] = [
  { id: "12m", label: "12 meses" },
  { id: "3y", label: "3 years" },
  { id: "5y", label: "5 years" },
  { id: "10y", label: "10 years" },
];

// ── Chart presets — 8 cards in Stitch order ─────────────────────────────────

export interface DynamicsChartPreset {
  /** Initial filter combination */
  initial: DynamicsFilterState;
  /** Stroke colour — alternates emerald/teal per Stitch pattern */
  color: string;
}

const EMERALD = "#059669"; // emerald-600 — odd-indexed cards in Stitch
const TEAL = "#0f766e"; // teal-700 — even-indexed cards in Stitch

export const CHART_PRESETS: DynamicsChartPreset[] = [
  // Row 1 — Mercado · Ocupacion (general vs Upper Upscale & Luxury)
  {
    initial: { scope: "market", class: "general", kpi: "occupancy", horizon: "5y" },
    color: EMERALD,
  },
  {
    initial: { scope: "market", class: "upper-luxury", kpi: "occupancy", horizon: "3y" },
    color: TEAL,
  },
  // Row 2 — Compset · ADR
  {
    initial: { scope: "compset", class: "general", kpi: "adr", horizon: "5y" },
    color: EMERALD,
  },
  {
    initial: { scope: "compset", class: "upper-luxury", kpi: "adr", horizon: "3y" },
    color: TEAL,
  },
  // Row 3 — Compset · RevPAR
  {
    initial: { scope: "compset", class: "general", kpi: "revpar", horizon: "5y" },
    color: EMERALD,
  },
  {
    initial: { scope: "compset", class: "upper-luxury", kpi: "revpar", horizon: "3y" },
    color: TEAL,
  },
  // Row 4 — Mercado · Supply / Demand RN
  {
    initial: { scope: "market", class: "general", kpi: "supply-rn", horizon: "5y" },
    color: EMERALD,
  },
  {
    initial: { scope: "market", class: "general", kpi: "demand-rn", horizon: "5y" },
    color: TEAL,
  },
];

// ── Chart shape ─────────────────────────────────────────────────────────────

export interface DynamicsChart {
  /** Y values in 0..40 viewBox space (45 - y is rendered) */
  values: number[];
}

// ── Deterministic mock generator ────────────────────────────────────────────

const HORIZON_POINTS: Record<DynamicsHorizon, number> = {
  "12m": 12,
  "3y": 6,
  "5y": 5,
  "10y": 10,
};

/** LCG step — deterministic per seed. */
function nextSeed(s: number): number {
  return (s * 9301 + 49297) % 233280;
}

function hashFilters(f: DynamicsFilterState): number {
  const s = `${f.scope}:${f.class}:${f.kpi}:${f.horizon}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}

/**
 * Generate `count` Y values — base + drift trend + amplitude noise, clamped
 * to 4..36 so the line never touches the card edges.
 */
function shape(
  seed: number,
  count: number,
  base: number,
  amplitude: number,
  drift: number,
): number[] {
  const result: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = nextSeed(s);
    const noise = s / 233280 - 0.5;
    const t = count <= 1 ? 0 : i / (count - 1);
    const value = base + drift * t + amplitude * noise * 2;
    result.push(Math.max(4, Math.min(36, value)));
  }
  return result;
}

/** Public API — returns a single chart for the given filter combo. */
export function getDynamicsChart(filters: DynamicsFilterState): DynamicsChart {
  const seed = hashFilters(filters);
  const points = HORIZON_POINTS[filters.horizon];
  // KPI-driven amplitude/drift so the curves feel different per metric
  const KPI_TUNE: Record<
    DynamicsKpi,
    { amplitude: number; drift: number; base: number }
  > = {
    occupancy: { amplitude: 8, drift: 4, base: 22 },
    adr: { amplitude: 6, drift: 8, base: 20 },
    revpar: { amplitude: 9, drift: 7, base: 21 },
    "supply-rn": { amplitude: 5, drift: 6, base: 24 },
    "demand-rn": { amplitude: 7, drift: 9, base: 22 },
  };
  const tune = KPI_TUNE[filters.kpi];
  return { values: shape(seed, points, tune.base, tune.amplitude, tune.drift) };
}

// ── Display helpers (used by chart card for the print caption) ──────────────

export function describeFilters(f: DynamicsFilterState): string {
  const scope = SCOPE_OPTIONS.find((o) => o.id === f.scope)?.label ?? "";
  const klass = CLASS_OPTIONS.find((o) => o.id === f.class)?.label ?? "";
  const kpi = KPI_OPTIONS.find((o) => o.id === f.kpi)?.label ?? "";
  const horizon = HORIZON_OPTIONS.find((o) => o.id === f.horizon)?.label ?? "";
  return `${scope} · ${klass} · ${kpi} · ${horizon}`;
}
