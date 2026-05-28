/**
 * Mapping layer · panel rows (PnlForecastRow.id) ↔ BD columns (pnl_template).
 *
 * Source-of-truth principle (operator-firmed 2026-05-28):
 *   - BD stores max CoStar granularity (food + beverage separated · property tax
 *     + insurance separated · FF&E reserve as own column · IT/telecom + staff
 *     memo + rent stored but NOT displayed).
 *   - Panel maps 1-to-1 where BD has the column. Visual grouping (F&B section,
 *     Tax+Insurance section) happens at render time, not at mapping time.
 *
 * Pre-condition: migration 0036 applies (adds `expenses_food_pct`,
 * `expenses_beverage_pct`, `ffe_reserve_pct` · drops `expenses_fb_pct`).
 * This module is pure code · nothing imports it yet (FASE 3 · sub-paso 1).
 */

import type { PnlForecastRow } from "./defaults";

// ── BD column registry ────────────────────────────────────────────────

/** All BD columns that hold a USALI percentage AND are panel-visible. */
export const PNL_DB_COLUMNS_VISIBLE = [
  "rooms_revenue_pct",
  "fb_food_pct",
  "fb_beverage_pct",
  "meeting_events_pct",
  "spa_wellness_pct",
  "parking_other_pct",
  "expenses_rooms_pct",
  "expenses_food_pct",       // NEW · migration 0036
  "expenses_beverage_pct",   // NEW · migration 0036
  "other_departments_pct",
  "admin_general_pct",
  "sales_marketing_pct",
  "operations_maintenance_pct",
  "utilities_pct",
  "management_fees_pct",
  "property_taxes_pct",
  "insurance_pct",
  "ffe_reserve_pct",         // NEW · migration 0036
] as const;
export type PnlDbColumn = (typeof PNL_DB_COLUMNS_VISIBLE)[number];

/**
 * BD columns stored for CoStar traceability but NEVER displayed in the panel.
 * Reason: EBITDA HotelVALORA is pre-rent / pre-IT-allocations · showing these
 * would let an analyst sum lines that don't add up against the published EBITDA.
 * Operator decision 2026-05-28.
 */
export const PNL_DB_COLUMNS_HIDDEN = [
  "it_telecom_pct",
  "staff_cost_memo_pct",
  "rent_pct",
] as const;
export type PnlDbColumnHidden = (typeof PNL_DB_COLUMNS_HIDDEN)[number];

// ── Panel row ↔ BD column mapping ─────────────────────────────────────

/** PnlForecastRow.id → BD column. 1-to-1 where panel renders an editable row. */
export const PANEL_ROW_TO_DB_COLUMN: Readonly<Record<string, PnlDbColumn>> = {
  // Operating Revenue (% of total revenue)
  "rev-rooms":     "rooms_revenue_pct",
  "rev-food":      "fb_food_pct",
  "rev-beverage":  "fb_beverage_pct",
  "rev-meetings":  "meeting_events_pct",
  "rev-spa":       "spa_wellness_pct",
  "rev-other":     "parking_other_pct",
  // Departmental Expenses (% of own dept revenue, except other → % total)
  "exp-rooms":     "expenses_rooms_pct",
  "exp-food":      "expenses_food_pct",
  "exp-beverage":  "expenses_beverage_pct",
  "exp-other":     "other_departments_pct",
  // Undistributed Expenses (% of total revenue)
  "exp-admin":     "admin_general_pct",
  "exp-sm":        "sales_marketing_pct",
  "exp-maint":     "operations_maintenance_pct",
  "exp-utilities": "utilities_pct",
  // Non-Operating Charges (% of total revenue)
  "non-mgmt":      "management_fees_pct",
  "non-tax":       "property_taxes_pct",
  "non-insurance": "insurance_pct",
  "non-ffe":       "ffe_reserve_pct",
} as const;

/**
 * Panel row IDs that are NOT backed by `pnl_template`. Reasons:
 *   - Room Stats (occupancy, ADR) live on a different data layer (backlog 3.5
 *     · candidate for migration to pnl_template + occupancy/adr columns).
 *   - Computed lines (RevPAR · subtotals) are derived from other inputs.
 *   - Static asset facts (rooms-count) are per-asset, not per-template.
 *
 * On panel load, these rows keep their `defaults.ts` value as-is.
 */
export const PANEL_ROW_NOT_IN_BD = new Set<string>([
  "rooms-count",
  "occupancy",
  "adr",
  "revpar",
  "subtotal-revenue",
  "subtotal-gop",
  "subtotal-ebitda",
  "margin",
]);

// ── Numeric ↔ display string conversion ───────────────────────────────

/**
 * Format BD numeric (`67.1`) as panel display string (`"67,1%"`).
 * Spanish locale · comma decimal · trims trailing `,0` for cleaner UI.
 */
export function dbToPanelValue(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  const fixed = Number(n).toFixed(1).replace(".", ",");
  return fixed.endsWith(",0") ? `${fixed.slice(0, -2)}%` : `${fixed}%`;
}

/**
 * Parse panel display string into BD numeric. Accepts:
 *   "67,1%" · "67.1" · "67%" · "67,1" · "  67,1 % " (whitespace tolerant).
 * Returns null on empty input or unparseable string.
 */
export function panelToDbValue(s: string | null | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  const cleaned = s.trim().replace(/%/g, "").replace(/,/g, ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ── Effective-row shape (what /pnl-template API returns) ──────────────

/**
 * Shape returned by SELECT … FROM pnl_template_effective.
 * All numeric columns are nullable (a row may have an Excel value but no
 * override, or vice versa · the view applies the merge).
 *
 * `overridden_lines` is the array of BD column names that have an override
 * applied (i.e. the value differs from the Excel base). Drives the
 * "operator-edited" tinting on the panel.
 */
export interface EffectiveTemplateRow {
  template_id: string;
  country: string;
  market: string | null;
  submarket: string | null;
  class: string | null;
  segmentation_type: "hotel" | "apartahotel" | "hostel" | null;
  data_source: "costar_submarket_aggregate" | "costar_national" | "derived_mvp_rule" | "pending_costar";
  // All visible numeric percentages
  rooms_revenue_pct: number | null;
  fb_food_pct: number | null;
  fb_beverage_pct: number | null;
  meeting_events_pct: number | null;
  spa_wellness_pct: number | null;
  parking_other_pct: number | null;
  expenses_rooms_pct: number | null;
  expenses_food_pct: number | null;
  expenses_beverage_pct: number | null;
  other_departments_pct: number | null;
  admin_general_pct: number | null;
  sales_marketing_pct: number | null;
  operations_maintenance_pct: number | null;
  utilities_pct: number | null;
  management_fees_pct: number | null;
  property_taxes_pct: number | null;
  insurance_pct: number | null;
  ffe_reserve_pct: number | null;
  // Override metadata
  overridden_lines: PnlDbColumn[] | null;
  last_imported_at: string | null;
  imported_from: string | null;
}

// ── Transformations ───────────────────────────────────────────────────

export type PnlPanelState = Record<string, { value: string; sub: string }>;

/**
 * BD row → panel state. Used on initial load and re-fetch.
 *
 * Strategy:
 *   - Walk every PnlForecastRow with `.assump` set (i.e. editable rows).
 *   - For BD-backed rows: read the BD numeric, format to display string.
 *   - For non-BD rows (Room Stats, computed lines, asset facts): keep the
 *     defaults.ts seed value.
 *   - The `sub` field (e.g. "% total rev") always comes from defaults.ts ·
 *     BD doesn't store this label since it's UX metadata.
 */
export function dbRowToPanelState(
  effective: EffectiveTemplateRow,
  rows: ReadonlyArray<Pick<PnlForecastRow, "id" | "assump">>,
): PnlPanelState {
  const out: PnlPanelState = {};
  for (const r of rows) {
    if (!r.assump) continue;
    const sub = r.assump.sub ?? "";
    const col = PANEL_ROW_TO_DB_COLUMN[r.id];
    if (col === undefined) {
      // Not BD-backed · keep seed value verbatim
      out[r.id] = { value: r.assump.value, sub };
      continue;
    }
    const n = effective[col];
    out[r.id] = { value: n !== null ? dbToPanelValue(n) : "", sub };
  }
  return out;
}

/**
 * Panel draft → override candidates. Used by `save()` to compute the diff
 * between operator's current edits and the BD-effective baseline.
 *
 * Returns only rows where the draft value DIFFERS from `effective` (epsilon
 * 0.05pp absorbs display-rounding noise: BD has 1 decimal, display rounds
 * trailing zeros, parsed-back may drift slightly).
 *
 * Rows not BD-backed (Room Stats etc.) are silently skipped.
 */
export function panelStateToOverrides(
  draft: PnlPanelState,
  effective: EffectiveTemplateRow,
): Array<{ line_item: PnlDbColumn; override_value: number }> {
  const out: Array<{ line_item: PnlDbColumn; override_value: number }> = [];
  for (const [rowId, { value }] of Object.entries(draft)) {
    const col = PANEL_ROW_TO_DB_COLUMN[rowId];
    if (col === undefined) continue;
    const parsed = panelToDbValue(value);
    if (parsed === null) continue;
    const current = effective[col];
    if (current !== null && Math.abs(parsed - current) < 0.05) continue;
    out.push({ line_item: col, override_value: parsed });
  }
  return out;
}

/**
 * Reverse lookup: BD column → panel row.id. Used by the "revert this cell to
 * Excel value" 1-click UX on overridden lines.
 */
export function dbColumnToPanelRowId(col: PnlDbColumn): string | undefined {
  for (const [rowId, c] of Object.entries(PANEL_ROW_TO_DB_COLUMN)) {
    if (c === col) return rowId;
  }
  return undefined;
}

/**
 * Type guard · is the operator's row.id a BD-backed editable percentage?
 */
export function isBdBackedRow(rowId: string): boolean {
  return rowId in PANEL_ROW_TO_DB_COLUMN;
}
