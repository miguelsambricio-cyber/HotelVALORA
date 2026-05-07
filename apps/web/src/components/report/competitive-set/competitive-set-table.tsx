import { Star, Wine, UtensilsCrossed, Sun, Users, Dumbbell, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FACILITY_ORDER,
  FACILITY_LABELS,
  type CompetitorProperty,
  type FacilityKey,
} from "@/lib/report/competitive-set-data";

const FACILITY_ICONS: Record<FacilityKey, React.ElementType> = {
  bar: Wine,
  restaurant: UtensilsCrossed,
  rooftop: Sun,
  meeting: Users,
  gym: Dumbbell,
  spa: Leaf,
};

function StarRating({ count, isSubject }: { count: number; isSubject: boolean }) {
  return (
    <div className={cn("flex gap-0.5", isSubject ? "text-emerald-500" : "text-amber-400")}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  );
}

function FacilityIcons({
  facilities,
  isSubject,
}: {
  facilities: Record<FacilityKey, boolean>;
  isSubject: boolean;
}) {
  return (
    <div className={cn("flex justify-center gap-1.5", isSubject ? "text-emerald-600" : "text-slate-500")}>
      {FACILITY_ORDER.map((key) => {
        const Icon = FACILITY_ICONS[key];
        return (
          <Icon
            key={key}
            size={16}
            title={FACILITY_LABELS[key]}
            className={cn("transition-opacity", !facilities[key] && "opacity-30")}
          />
        );
      })}
    </div>
  );
}

function LocationScoreBar({
  score,
  isSubject,
}: {
  score: number;
  isSubject: boolean;
}) {
  const pct = `${(score / 10) * 100}%`;
  return (
    <div className="flex items-center justify-end gap-3">
      <div
        className={cn(
          "w-20 h-2 rounded-full overflow-hidden",
          isSubject ? "bg-emerald-200" : "bg-slate-200"
        )}
      >
        <div
          className={cn("h-full rounded-full", isSubject ? "bg-emerald-600" : "bg-slate-600")}
          style={{ width: pct }}
        />
      </div>
      <span
        className={cn(
          "font-bold text-sm tabular-nums w-8 text-right",
          isSubject ? "text-emerald-900" : "text-slate-700"
        )}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

interface CompetitiveSetTableProps {
  properties: CompetitorProperty[];
}

export function CompetitiveSetTable({ properties }: CompetitiveSetTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 w-1/4">
              Property Name
            </th>
            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 w-32">
              Category
            </th>
            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center w-24">
              Keys
            </th>
            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 w-32">
              Submarket
            </th>
            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center">
              CompSet Facilities
            </th>
            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right w-44">
              Location Score
            </th>
            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right w-28">
              Distance
            </th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {properties.map((property) => (
            <tr
              key={property.id}
              className={cn(
                "border-b transition-colors",
                property.isSubject
                  ? "border-emerald-100 bg-emerald-50/50"
                  : "border-slate-100 hover:bg-slate-50"
              )}
            >
              {/* Property name */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      property.isSubject ? "bg-emerald-500" : "bg-slate-300"
                    )}
                  />
                  <span
                    className={cn(
                      "font-bold",
                      property.isSubject ? "text-emerald-900" : "text-slate-700"
                    )}
                  >
                    {property.name}
                  </span>
                </div>
              </td>

              {/* Stars */}
              <td className="py-4 px-4">
                <StarRating count={property.stars} isSubject={property.isSubject} />
              </td>

              {/* Keys */}
              <td
                className={cn(
                  "py-4 px-4 text-center font-semibold",
                  property.isSubject ? "font-bold text-emerald-900" : "text-slate-600"
                )}
              >
                {property.keys}
              </td>

              {/* Submarket */}
              <td
                className={cn(
                  "py-4 px-4 font-semibold",
                  property.isSubject ? "text-emerald-800" : "text-slate-600"
                )}
              >
                {property.submarket}
              </td>

              {/* Facilities */}
              <td className="py-4 px-4">
                <FacilityIcons
                  facilities={property.facilities}
                  isSubject={property.isSubject}
                />
              </td>

              {/* Location score */}
              <td className="py-4 px-4">
                <LocationScoreBar
                  score={property.locationScore}
                  isSubject={property.isSubject}
                />
              </td>

              {/* Distance */}
              <td className="py-4 px-4 text-right">
                {property.distance ? (
                  <span className="font-semibold text-slate-600 tabular-nums">
                    {property.distance}
                  </span>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
