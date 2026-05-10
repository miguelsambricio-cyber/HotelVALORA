import type { FacilityId } from "./types";

export interface Facility {
  id: FacilityId;
  label: string;
}

export const FACILITIES: Facility[] = [
  { id: "bar-cafe", label: "Bar & Café" },
  { id: "restaurant", label: "Restaurant" },
  { id: "rooftop-bar", label: "Rooftop Bar" },
  { id: "meeting-events", label: "Meeting & Events" },
  { id: "parking", label: "Parking" },
  { id: "gym", label: "Gym" },
  { id: "spa-wellness", label: "SPA Wellness" },
  { id: "pool", label: "Pool" },
];
