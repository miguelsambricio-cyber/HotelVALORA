import type { TrendDirection } from "@/types/report";

type Currency = "EUR" | "USD" | "GBP";

// ── Currency ──────────────────────────────────────────────────────────────────

export function formatReportCurrency(
  value: number,
  currency: Currency = "EUR",
  compact = false
): string {
  const locale = currency === "USD" ? "en-US" : "es-ES";
  if (compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Per-unit metrics ──────────────────────────────────────────────────────────

export function formatRevPAR(value: number, currency: Currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPerRoom(value: number, currency: Currency = "EUR"): string {
  return `${formatReportCurrency(value, currency, true)}/hab`;
}

// ── Ratios and multiples ──────────────────────────────────────────────────────

export function formatMultiple(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}x`;
}

export function formatCapRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatBasisPoints(delta: number): string {
  return `${delta >= 0 ? "+" : ""}${delta}bps`;
}

// ── Change / delta ────────────────────────────────────────────────────────────

export function formatSignedPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function parseTrend(change: number, threshold = 0.1): TrendDirection {
  if (Math.abs(change) < threshold) return "flat";
  return change > 0 ? "up" : "down";
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export function formatReportDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function formatReportPeriod(period: string): string {
  return period; // passthrough — caller controls display
}

// ── Large numbers ─────────────────────────────────────────────────────────────

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}
