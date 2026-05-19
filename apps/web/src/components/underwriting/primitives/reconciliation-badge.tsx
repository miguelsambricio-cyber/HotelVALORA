import { Check, AlertTriangle, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reconciliation badge · institutional confidence signal.
 *
 * Corporate light theme · matches the P&L's pill conventions
 * (slate ring-1 + low-saturation background + *-700 text).
 */

export type ReconciliationStatus = "ok" | "warn" | "fail" | "info";

export function ReconciliationBadge({
  status,
  label,
  detail,
}: {
  status: ReconciliationStatus;
  label: string;
  detail?: string;
}) {
  const tone =
    status === "ok"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "warn"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : status === "info"
          ? "bg-slate-50 text-slate-700 ring-slate-200"
          : "bg-rose-50 text-rose-700 ring-rose-200";

  const Icon =
    status === "ok" ? Check : status === "warn" || status === "info" ? AlertTriangle : CircleAlert;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] ring-1",
        tone,
      )}
      title={detail}
    >
      <Icon size={11} />
      <span className="font-headline font-bold uppercase tracking-[0.18em]">{label}</span>
    </span>
  );
}
