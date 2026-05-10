import {
  Car,
  Coffee,
  Dumbbell,
  Sparkles,
  UtensilsCrossed,
  Users,
  Waves,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { ReportAmenities } from "@/types/library";
import { cn } from "@/lib/utils";

const AMENITY_ICON: Record<keyof ReportAmenities, LucideIcon> = {
  bar: Coffee,
  restaurant: UtensilsCrossed,
  rooftop: Wine,
  meetingRooms: Users,
  gym: Dumbbell,
  spa: Sparkles,
  pool: Waves,
  parking: Car,
};

const AMENITY_LABEL: Record<keyof ReportAmenities, string> = {
  bar: "Bar",
  restaurant: "Restaurant",
  rooftop: "Rooftop",
  meetingRooms: "Meeting Rooms",
  gym: "Gym",
  spa: "Spa",
  pool: "Pool",
  parking: "Parking",
};

export interface AmenityIconCellProps {
  /** Which amenity this cell represents */
  amenity: keyof ReportAmenities;
  /** Whether the report has it */
  active: boolean;
}

/**
 * Single amenity cell — renders the icon in `forest-700` when present,
 * `slate-300` when absent. The label is exposed via `title` so power
 * users can hover to confirm what each column means.
 */
export function AmenityIconCell({ amenity, active }: AmenityIconCellProps) {
  const Icon = AMENITY_ICON[amenity];
  const label = AMENITY_LABEL[amenity];
  return (
    <span
      title={label}
      aria-label={`${label} ${active ? "available" : "not available"}`}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        active ? "text-forest-700" : "text-slate-300",
      )}
    >
      <Icon size={14} aria-hidden />
    </span>
  );
}
