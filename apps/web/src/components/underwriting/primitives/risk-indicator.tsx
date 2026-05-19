/**
 * Risk indicator · institutional underwriting page primitive.
 *
 * Corporate light theme · tinted backgrounds match the WCAG-compliant
 * combinations used in /report/financials/pl (rose-50/amber-50/emerald-50
 * with their *-700 text counterparts).
 *
 * Severity is implied by the engine warning's prefix emoji:
 *   ❌ → stress (rose) · ⚠️ → watch (amber) · ℹ️ → info (slate)
 *   ok → set explicitly when no warnings (emerald)
 */

export interface RiskIndicatorProps {
  severity: "ok" | "watch" | "stress" | "info";
  label: string;
  detail?: string;
}

export function RiskIndicator({ severity, label, detail }: RiskIndicatorProps) {
  const tone =
    severity === "stress" ? "border-rose-200 bg-rose-50"
    : severity === "watch" ? "border-amber-200 bg-amber-50"
    : severity === "ok" ? "border-emerald-200 bg-emerald-50"
    : "border-slate-200 bg-slate-50";

  const dot =
    severity === "stress" ? "bg-rose-500"
    : severity === "watch" ? "bg-amber-500"
    : severity === "ok" ? "bg-emerald-500"
    : "bg-slate-400";

  const labelTone =
    severity === "stress" ? "text-rose-700"
    : severity === "watch" ? "text-amber-700"
    : severity === "ok" ? "text-emerald-700"
    : "text-slate-700";

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
          <p className="mt-1 break-words font-mono text-[10.5px] leading-relaxed text-slate-700">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

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
