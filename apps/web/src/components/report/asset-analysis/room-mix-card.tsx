import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { RoomMixRow } from "@/lib/report/asset-analysis-data";

export interface RoomMixCardProps {
  rows: RoomMixRow[];
  /** Card heading (defaults to "Room Mix") */
  title?: string;
  className?: string;
}

/**
 * Card showing the room-type breakdown as a Type/Units/Size table. The "total"
 * row is bolded and visually separated from the per-type rows by a thin spacer
 * strip (matches the Stitch reference).
 */
export function RoomMixCard({
  rows,
  title = "Room Mix",
  className,
}: RoomMixCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col print:shadow-none",
        className,
      )}
    >
      <div className="flex justify-between items-baseline mb-4">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {title}
        </h4>
      </div>

      <div className="flex flex-col text-[13px]">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center h-[28px] border-b border-slate-200 mb-1">
          <span className="text-slate-400 font-bold uppercase text-[10px] text-left">
            Type
          </span>
          <span className="text-slate-400 font-bold uppercase text-[10px] text-center w-12">
            Units
          </span>
          <span className="text-slate-400 font-bold uppercase text-[10px] text-right w-12">
            Size
          </span>
        </div>

        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          return (
            <Fragment key={row.type}>
              <div
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] gap-4 items-center h-[28px]",
                  !isLast && "border-b border-slate-100",
                )}
              >
                <span
                  className={cn(
                    "uppercase text-[11px] text-left text-slate-500",
                    row.isTotal ? "font-bold" : "font-medium",
                  )}
                >
                  {row.type}
                </span>
                <span className="font-bold text-forest-700 text-sm text-center w-12">
                  {row.units}
                </span>
                <span className="text-slate-400 font-medium text-[11px] text-right w-12">
                  {row.sizeSqm}m²
                </span>
              </div>
              {row.isTotal && (
                <div className="h-3 w-full bg-slate-50/50 border-b border-slate-100" />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
