import { Check, AlertTriangle, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reconciliation badge · institutional confidence signal.
 *
 *   · OK · invariant holds (Assets == Eq + Debt · Cash matches CF · etc.)
 *   · WARN · within tolerance but worth checking (e.g. DSCR 1.0–1.1)
 *   · FAIL · invariant broken · engine refuses to publish
 *
 * Block 1: visual primitive only · Block 2 wires real reconciliation
 * results from the engine.
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
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40"
      : status === "warn"
        ? "bg-amber-500/15 text-amber-200 ring-amber-500/40"
        : status === "info"
          ? "bg-slate-700/40 text-slate-200 ring-slate-600/60"
          : "bg-rose-500/15 text-rose-200 ring-rose-500/40";

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
