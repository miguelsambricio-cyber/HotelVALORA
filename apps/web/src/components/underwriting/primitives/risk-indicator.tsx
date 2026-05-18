/**
 * Risk indicator · institutional underwriting page primitive.
 *
 * Renders reconciliation warnings as ELEGANT risk cards — NOT inline
 * pills (which clipped on long detail strings and broke the IC layout).
 * Each card carries severity dot · label · multi-line wrap-friendly
 * detail. Designed for a `grid sm:grid-cols-2 lg:grid-cols-3` parent
 * container.
 *
 * Severity is implied by the engine warning's prefix emoji:
 *   ❌ → stress (rose)
 *   ⚠️ → watch  (amber)
 *   ℹ️ → info   (slate)
 *   ok    → set explicitly when no warnings present (emerald)
 *
 * Print discipline · subtle borders · dark→light inversion ·
 * break-inside-avoid keeps the card whole across page breaks.
 */

export interface RiskIndicatorProps {
  severity: "ok" | "watch" | "stress" | "info";
  label: string;
  detail?: string;
}

export function RiskIndicator({ severity, label, detail }: RiskIndicatorProps) {
  const tone =
    severity === "stress" ? "border-rose-400/50 bg-rose-500/15 print:border-rose-500 print:bg-rose-50"
    : severity === "watch" ? "border-amber-300/50 bg-amber-500/15 print:border-amber-500 print:bg-amber-50"
    : severity === "ok" ? "border-emerald-400/50 bg-emerald-500/15 print:border-emerald-500 print:bg-emerald-50"
    : "border-slate-600/70 bg-slate-800/60 print:border-slate-300 print:bg-white";

  const dot =
    severity === "stress" ? "bg-rose-400 print:bg-rose-600"
    : severity === "watch" ? "bg-amber-300 print:bg-amber-600"
    : severity === "ok" ? "bg-emerald-300 print:bg-emerald-600"
    : "bg-slate-400 print:bg-slate-500";

  const labelTone =
    severity === "stress" ? "text-rose-200 print:text-rose-700"
    : severity === "watch" ? "text-amber-200 print:text-amber-700"
    : severity === "ok" ? "text-emerald-200 print:text-emerald-700"
    : "text-slate-200 print:text-slate-800";

  return (
    <div
      className={`flex items-start gap-2 rounded-md border p-2.5 print:break-inside-avoid ${tone}`}
    >
      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <p className={`font-headline text-[10px] font-extrabold uppercase tracking-[0.18em] ${labelTone}`}>
          {label}
        </p>
        {detail && (
          <p className="mt-1 break-words font-mono text-[10.5px] leading-relaxed text-slate-200 print:text-slate-700">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Convert an engine reconciliation warning string into a RiskIndicator
 * severity + label + detail. The engine prefixes each warning with an
 * emoji (❌ ⚠️ ℹ️) which we parse to bucket the severity.
 */
export function parseReconciliationWarning(raw: string): RiskIndicatorProps {
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
