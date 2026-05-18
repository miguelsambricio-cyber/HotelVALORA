/**
 * Engine-wide constants and tolerances.
 *
 * Centralised so the Excel parity reports cite a single source and
 * the operator can audit thresholds without spelunking module bodies.
 *
 * Tolerances are deliberately tight — a 1 € absolute or 0.1% relative
 * drift triggers a "drift" badge; 5× either triggers "fail".
 */

/** Number of payment periods within one year (annual scheme today). */
export const PAYMENTS_PER_YEAR = 1;

/** ±1 € absolute tolerance for euro-denominated parity checks. */
export const TOLERANCE_EUR = 1;

/** ±0.10% absolute tolerance for ratio/percentage parity checks. */
export const TOLERANCE_PCT = 0.001;

/** ±0.05 unit absolute tolerance for ratio metrics (DSCR / ICR / MOIC). */
export const TOLERANCE_RATIO = 0.05;

/** Spanish Ley IS defaults · operator can override per scenario. */
export const TAX_DEFAULTS = {
  CIT_RATE_PCT: 25,
  EBITDA_LIMIT_PCT: 30,
  FINEXP_FLOOR_EUR: 1_000_000,
} as const;

/** Sign conventions used inside the engine. */
export const SIGN = {
  /** Costs / outflows are stored as NEGATIVE numbers in PnL/CF. */
  COSTS_NEGATIVE: true,
  /** Interest expense is stored as NEGATIVE in PnL.financial_expenses. */
  INTEREST_NEGATIVE: true,
} as const;
