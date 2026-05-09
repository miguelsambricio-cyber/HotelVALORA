// Display formatters for Financials.
//
// All formatting respects the `Currency` setting on the assumption store —
// switching currency at the data layer flips every formatted value.

import { CURRENCY_CONFIG, type Currency } from "./currency";

/**
 * Format a currency value (e.g. 12_450_000 → "12,450,000 €" for EUR /
 * "$12,450,000" for USD). Decimals default to 0 for thousands-up totals
 * but can be raised for line-level metrics like ADR (175.00 €).
 */
export function formatCurrency(
  value: number,
  currency: Currency,
  options: { decimals?: number; compact?: boolean } = {},
): string {
  const cfg = CURRENCY_CONFIG[currency];
  const { decimals = 0, compact = false } = options;
  const formatted = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? "compact" : "standard",
  }).format(value);
  return cfg.symbolPosition === "prefix"
    ? `${cfg.symbol}${formatted}`
    : `${formatted} ${cfg.symbol}`;
}

/** Format a 0..1 ratio as "65.0%". */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format an absolute integer (rooms count, days, etc.) with locale grouping. */
export function formatAbsolute(value: number, locale = "es-ES"): string {
  return new Intl.NumberFormat(locale).format(Math.round(value));
}

/**
 * Format a year-over-year delta as "+8.4%" / "-2.1%" / "0%". `null` for the
 * first year (no comparison) or when the prior value is 0.
 */
export function formatYearDelta(
  current: number,
  previous: number | undefined,
): string | null {
  if (previous === undefined || previous === 0) return null;
  const ratio = (current - previous) / previous;
  const pct = ratio * 100;
  if (Math.abs(pct) < 0.05) return "0%";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Format an absolute percentage-point delta (e.g. occupancy 65% → 68% is
 * "+3pp"). Used by the Occupancy% row where YoY is naturally absolute.
 */
export function formatPpDelta(
  current: number,
  previous: number | undefined,
): string | null {
  if (previous === undefined) return null;
  const pp = (current - previous) * 100;
  if (Math.abs(pp) < 0.05) return "0pp";
  const sign = pp > 0 ? "+" : "";
  return `${sign}${pp.toFixed(0)}pp`;
}

/**
 * Parse a user-typed assumption string back into a numeric ratio / value.
 * Tolerates "65", "65%", "65.0%", "  65 % ", "$175.00", "175,00 €".
 * Returns `null` on parse failure — callers should fall back to the prior
 * known good value.
 */
export function parseAssumption(
  raw: string,
  kind: "percent" | "currency" | "absolute",
): number | null {
  const stripped = raw.replace(/[€$£\s]/g, "").replace(",", ".");
  if (kind === "percent") {
    const m = stripped.replace("%", "");
    const n = parseFloat(m);
    if (Number.isNaN(n)) return null;
    return n / 100;
  }
  const n = parseFloat(stripped);
  return Number.isNaN(n) ? null : n;
}
