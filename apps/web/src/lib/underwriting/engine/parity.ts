/**
 * Excel parity tooling.
 *
 * Every Block 3+ module ships with parity checks against the operator's
 * reference workbook. This file provides the primitive functions; module
 * authors compose them and emit markdown reports via `buildParityReport`.
 *
 * Status semantics:
 *   · match   ·  |delta| ≤ tolerance
 *   · drift   ·  tolerance < |delta| ≤ 5×tolerance · documented, accepted
 *   · fail    ·  |delta| > 5×tolerance · investigate before shipping
 *
 * Determinism: parity checks are pure functions of the inputs they
 * accept. Reports are reproducible — same engine version + same Excel
 * snapshot → byte-identical markdown.
 */

import { TOLERANCE_EUR, TOLERANCE_PCT, TOLERANCE_RATIO } from "./_constants";

export type ParityKind = "eur" | "pct" | "ratio";

export interface ParityCheck {
  /** Identifier used in reports + log lines. */
  id: string;
  /** Short human-readable description. */
  label: string;
  /** Module of origin · pnl · financing · investment etc. */
  module: string;
  kind: ParityKind;
  expected: number;
  actual: number;
  /** Optional override · falls back to per-kind default. */
  tolerance?: number;
  note?: string;
}

export interface ParityResult extends ParityCheck {
  delta: number;
  delta_pct: number;
  status: "match" | "drift" | "fail";
  resolved_tolerance: number;
}

export interface ParitySummary {
  matched: number;
  drifted: number;
  failed: number;
  total: number;
  /** Module → counts. */
  by_module: Record<string, { matched: number; drifted: number; failed: number }>;
}

export function defaultToleranceFor(kind: ParityKind): number {
  switch (kind) {
    case "eur":
      return TOLERANCE_EUR;
    case "pct":
      return TOLERANCE_PCT;
    case "ratio":
      return TOLERANCE_RATIO;
  }
}

export function runParityCheck(check: ParityCheck): ParityResult {
  const tolerance = check.tolerance ?? defaultToleranceFor(check.kind);
  const delta = check.actual - check.expected;
  const delta_pct = check.expected === 0
    ? (check.actual === 0 ? 0 : Number.POSITIVE_INFINITY)
    : (delta / check.expected) * 100;
  const absDelta = Math.abs(delta);
  const status: ParityResult["status"] =
    absDelta <= tolerance ? "match" : absDelta <= tolerance * 5 ? "drift" : "fail";
  return { ...check, delta, delta_pct, status, resolved_tolerance: tolerance };
}

export function runParityChecks(checks: ParityCheck[]): { results: ParityResult[]; summary: ParitySummary } {
  const results = checks.map(runParityCheck);
  const summary: ParitySummary = {
    matched: 0,
    drifted: 0,
    failed: 0,
    total: results.length,
    by_module: {},
  };
  for (const r of results) {
    if (!summary.by_module[r.module]) {
      summary.by_module[r.module] = { matched: 0, drifted: 0, failed: 0 };
    }
    summary[r.status === "match" ? "matched" : r.status === "drift" ? "drifted" : "failed"]++;
    summary.by_module[r.module][r.status === "match" ? "matched" : r.status === "drift" ? "drifted" : "failed"]++;
  }
  return { results, summary };
}

/** Format a parity result table as GitHub-flavoured markdown. */
export function formatResultsAsMarkdown(results: ParityResult[]): string {
  const header = `| Module | Check | Kind | Expected | Engine | Δ | Δ% | Status |\n|---|---|---|---:|---:|---:|---:|---|`;
  const rows = results.map((r) => {
    const fmtN = (n: number) => Number.isFinite(n)
      ? r.kind === "ratio"
        ? n.toFixed(2)
        : new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.round(n))
      : "∞";
    const fmtPct = (n: number) => Number.isFinite(n) ? `${n.toFixed(3)}%` : "∞";
    const badge = r.status === "match" ? "✅" : r.status === "drift" ? "⚠️" : "❌";
    return `| ${r.module} | ${r.label} | ${r.kind} | ${fmtN(r.expected)} | ${fmtN(r.actual)} | ${fmtN(r.delta)} | ${fmtPct(r.delta_pct)} | ${badge} ${r.status} |`;
  });
  return [header, ...rows].join("\n");
}

/** Format the summary block at the top of a report. */
export function formatSummaryAsMarkdown(summary: ParitySummary): string {
  const lines = [
    `**Total checks**: ${summary.total} · ✅ ${summary.matched} match · ⚠️ ${summary.drifted} drift · ❌ ${summary.failed} fail`,
    "",
    "| Module | ✅ Match | ⚠️ Drift | ❌ Fail |",
    "|---|---:|---:|---:|",
    ...Object.entries(summary.by_module).map(([m, s]) =>
      `| ${m} | ${s.matched} | ${s.drifted} | ${s.failed} |`,
    ),
  ];
  return lines.join("\n");
}
