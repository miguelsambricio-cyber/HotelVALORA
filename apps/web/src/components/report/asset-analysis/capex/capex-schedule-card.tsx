import { cn } from "@/lib/utils";
import type { CapexSchedule } from "@/lib/report/capex-renders-data";
import { CapexScheduleRow } from "./capex-schedule-row";

export interface CapexScheduleCardProps {
  schedule: CapexSchedule;
  /** Optional anchor id (defaults to "schedule") */
  id?: string;
  /** Card title (defaults to "CAPEX Schedule") */
  title?: string;
  className?: string;
}

/**
 * CAPEX Schedule rendered as a card that lives inside the left CAPEX column —
 * shares the same outer chrome (white surface, slate-200 border, rounded-xl,
 * shadow-sm) used by `CapexCategory` so the left stack stays visually
 * coherent with Hard Cost / Soft Cost / Project Costs.
 *
 * Internal layout delegates to `CapexScheduleRow` for the 3-column row
 * (slider · badge · operational toggle).
 */
export function CapexScheduleCard({
  schedule,
  id = "schedule",
  title = "CAPEX Schedule",
  className,
}: CapexScheduleCardProps) {
  return (
    <div
      id={id}
      className={cn(
        "bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:break-inside-avoid",
        className,
      )}
    >
      <div className="p-8">
        <h4 className="font-bold font-headline text-slate-800 text-sm mb-6">
          {title}
        </h4>
        <CapexScheduleRow schedule={schedule} />
      </div>
    </div>
  );
}
