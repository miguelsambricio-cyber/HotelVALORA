import { Star, Wine, UtensilsCrossed, Sun, Users, Dumbbell, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FACILITY_ORDER,
  FACILITY_LABELS,
  type CompetitorProperty,
  type FacilityKey,
} from "@/lib/report/competitive-set-data";
import { formatSignedInt, formatSignedDecimal } from "@/lib/hotels/compset-kpi";

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

/**
 * Inline signed-delta badge · attached next to a base value when the
 * row has differential KPIs vs subject (Phase H). Tone-aware so the
 * IC reader can read the comparison at a glance without parsing the
 * sign:
 *   · keys: positive (bigger competitor) → slate · neutral
 *   · keys: negative (smaller competitor) → slate · neutral
 *   · loc-score: positive (better location) → emerald
 *   · loc-score: negative (worse location)  → amber
 */
function DeltaBadge({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : tone === "warn"
        ? "text-amber-800 bg-amber-50 ring-amber-200"
        : "text-slate-600 bg-slate-50 ring-slate-200";
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex items-center rounded-full px-1.5 py-px font-mono text-[10px] font-bold tabular-nums ring-1",
        cls,
      )}
    >
      {text}
    </span>
  );
}

/** Composite match pill (0-100 · 100 = perfect match against subject). */
function MatchScorePill({ score }: { score: number }) {
  const tone =
    score >= 75 ? "ok" : score >= 50 ? "neutral" : "warn";
  const cls =
    tone === "ok"
      ? "text-emerald-800 bg-emerald-50 ring-emerald-200"
      : tone === "warn"
        ? "text-amber-800 bg-amber-50 ring-amber-200"
        : "text-slate-700 bg-slate-50 ring-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ring-1",
        cls,
      )}
    >
      {score}
    </span>
  );
}

export function CompetitiveSetTable({ properties }: CompetitiveSetTableProps) {
  // Show the Match column only when at least one row has vsSubject ·
  // canonical /report/competitive-set keeps the original 7-column
  // layout · Madrid Centro overlay opts into the 8th column.
  const showMatchColumn = properties.some((p) => p.vsSubject !== undefined);

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
            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center w-28">
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
            {showMatchColumn && (
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center w-24">
                Match
              </th>
            )}
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

              {/* Keys (with optional delta badge) */}
              <td
                className={cn(
                  "py-4 px-4 text-center font-semibold",
                  property.isSubject ? "font-bold text-emerald-900" : "text-slate-600"
                )}
              >
                <span className="tabular-nums">{property.keys}</span>
                {property.vsSubject && (
                  <DeltaBadge text={formatSignedInt(property.vsSubject.keysDelta)} />
                )}
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

              {/* Location score (with optional delta badge) */}
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-1.5">
                  <LocationScoreBar
                    score={property.locationScore}
                    isSubject={property.isSubject}
                  />
                  {property.vsSubject && (
                    <DeltaBadge
                      text={formatSignedDecimal(property.vsSubject.locationScoreDelta, 1)}
                      tone={
                        property.vsSubject.locationScoreDelta > 0
                          ? "ok"
                          : property.vsSubject.locationScoreDelta < 0
                            ? "warn"
                            : "neutral"
                      }
                    />
                  )}
                </div>
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

              {/* Match (Phase H · only when vsSubject column is active) */}
              {showMatchColumn && (
                <td className="py-4 px-4 text-center">
                  {property.vsSubject ? (
                    <MatchScorePill score={property.vsSubject.matchScore} />
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
