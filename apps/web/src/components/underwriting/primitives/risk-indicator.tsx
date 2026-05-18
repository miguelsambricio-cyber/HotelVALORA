/**
 * Risk indicator · institutional underwriting page primitive.
 *
 * Renders reconciliation warnings from the engine as ELEGANT risk
 * badges · NOT error states. The IC reader expects to see institutional
 * risk indicators (DSCR stress · leverage pressure · DTA utilization ·
 * refinance sensitivity) explicitly · they signal sophistication.
 *
 * Severity is implied by the engine warning's prefix emoji:
 *   ❌ → fail (rose)
 *   ⚠️ → warn (amber)
 *   ℹ️ → info (slate)
 *
 * Print discipline · subtle borders · dark→light inversion.
 */

export interface RiskIndicatorProps {
  /** Severity bucket · ok / watch / stress · NOT error. */
  severity: "ok" | "watch" | "stress" | "info";
  label: string;
  detail?: string;
}

export function RiskIndicator({ severity, label, detail }: RiskIndicatorProps) {
  const tone =
    severity === "stress" ? "border-rose-400/30 bg-rose-500/10 text-rose-200 print:border-rose-500 print:bg-rose-50 print:text-rose-700"
    : severity === "watch" ? "border-amber-300/30 bg-amber-500/10 text-amber-200 print:border-amber-500 print:bg-amber-50 print:text-amber-700"
    : severity === "ok" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 print:border-emerald-500 print:bg-emerald-50 print:text-emerald-700"
    : "border-slate-700/60 bg-slate-900/40 text-slate-300 print:border-slate-300 print:bg-white print:text-slate-700";

  const dot =
    severity === "stress" ? "bg-rose-400 print:bg-rose-600"
    : severity === "watch" ? "bg-amber-300 print:bg-amber-600"
    : severity === "ok" ? "bg-emerald-300 print:bg-emerald-600"
    : "bg-slate-400 print:bg-slate-500";

  return (
    <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">{label}</span>
      {detail && <span className="font-mono text-[9.5px] opacity-80">· {detail}</span>}
    </span>
  );
}

/**
 * Convert an engine reconciliation warning string into a RiskIndicator
 * severity + label + detail. The engine prefixes each warning with an
 * emoji (❌ ⚠️ ℹ️) which we parse to bucket the severity.
 */
export function parseReconciliationWarning(raw: string): RiskIndicatorProps {
  // Strip leading emoji + space, then split on " · " for label vs detail.
  const trimmed = raw.replace(/^[❌⚠️ℹ️]+\s*/, "").trim();
  const parts = trimmed.split(" · ");
  const label = parts[0] ?? trimmed;
  const detail = parts.slice(1).join(" · ") || undefined;
  const severity: RiskIndicatorProps["severity"] = raw.startsWith("❌")
    ? "stress"
    : raw.startsWith("⚠️")
      ? "watch"
      : "info";
  return { severity, label, detail };
}
