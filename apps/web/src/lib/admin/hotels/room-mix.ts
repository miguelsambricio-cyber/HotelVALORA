import type { HotelProfile } from "./types";

/**
 * Canonical room-mix taxonomy · matches the operator-defined institutional
 * categories used in the asset-analysis report.
 *
 * Booking.com returns rich free-text room names ("Deluxe King Room with
 * City View", "One-Bedroom Apartment with Terrace", "Junior Suite"); we
 * classify each into one of seven canonical buckets so the report's
 * Room Mix table renders consistently across hotels.
 */

export type RoomBucket =
  | "individuales"
  | "doble"
  | "junior_suite"
  | "suite"
  | "estudio"
  | "dorm_1"
  | "dorm_2";

export interface RoomBucketDef {
  key: RoomBucket;
  label: string;
}

export const ROOM_BUCKETS: RoomBucketDef[] = [
  { key: "individuales", label: "Individuales" },
  { key: "doble", label: "Doble" },
  { key: "junior_suite", label: "Junior Suite" },
  { key: "suite", label: "Suite" },
  { key: "estudio", label: "Estudio" },
  { key: "dorm_1", label: "1 dormitorio" },
  { key: "dorm_2", label: "2 dormitorios" },
];

const BUCKET_OF: Array<{ test: (name: string) => boolean; bucket: RoomBucket }> = [
  // Order matters · more specific patterns first
  { test: (n) => /\bjunior\s*suite\b/i.test(n), bucket: "junior_suite" },
  { test: (n) => /\b(two|2|dos)[-\s]*(bedroom|dorm|habitaciones?)\b/i.test(n), bucket: "dorm_2" },
  { test: (n) => /\b(one|1|un)[-\s]*(bedroom|dorm|habitaci[oó]n)\b/i.test(n), bucket: "dorm_1" },
  { test: (n) => /\b(studio|estudio)\b/i.test(n), bucket: "estudio" },
  { test: (n) => /\b(suite|presidential)\b/i.test(n), bucket: "suite" },
  // Single first, double-style as fallback
  { test: (n) => /\b(single|individual|simple)\b/i.test(n), bucket: "individuales" },
  { test: (n) => /\b(double|twin|queen|king|standard|deluxe|superior|classic|premier|executive)\b/i.test(n), bucket: "doble" },
];

/** Classify one Booking room-name string into a canonical bucket.
 *  Falls back to "doble" since most unclassified rooms are double-style. */
export function classifyRoomName(name: string): RoomBucket {
  if (!name) return "doble";
  for (const rule of BUCKET_OF) {
    if (rule.test(name)) return rule.bucket;
  }
  return "doble";
}

export interface RoomMixSummaryRow {
  bucket: RoomBucket;
  label: string;
  /** Distinct Booking room types that landed in this bucket. */
  type_count: number;
  /** Mean sqm across the bucket (NaN-safe; null when no sqm data). */
  avg_sqm: number | null;
  /** Sum of `count` when Booking provided per-type counts (rare). */
  total_units: number | null;
  /** Representative name (first room type that landed in the bucket). */
  example: string | null;
}

export interface RoomMixSummary {
  rows: RoomMixSummaryRow[];
  /** Number of distinct Booking room types overall · used to gate the
   *  card (don't render if empty). */
  type_count_total: number;
  /** Total units when count data is available. */
  total_units: number | null;
}

/** Aggregate `profile.room_types[]` into the 7-bucket canonical mix. */
export function summariseRoomMix(profile: HotelProfile | null | undefined): RoomMixSummary {
  const rows: RoomMixSummaryRow[] = ROOM_BUCKETS.map((b) => ({
    bucket: b.key,
    label: b.label,
    type_count: 0,
    avg_sqm: null,
    total_units: null,
    example: null,
  }));
  const rowByKey = new Map<RoomBucket, RoomMixSummaryRow>(rows.map((r) => [r.bucket, r]));
  // Working sums for averaging
  const sumByKey = new Map<RoomBucket, { sqmSum: number; sqmN: number; unitsSum: number; unitsHas: boolean }>();

  const room_types = profile?.room_types ?? [];
  for (const rt of room_types) {
    const bucket = classifyRoomName(rt.name);
    const row = rowByKey.get(bucket)!;
    row.type_count += 1;
    if (!row.example) row.example = rt.name;
    let work = sumByKey.get(bucket);
    if (!work) {
      work = { sqmSum: 0, sqmN: 0, unitsSum: 0, unitsHas: false };
      sumByKey.set(bucket, work);
    }
    if (typeof rt.sqm === "number" && Number.isFinite(rt.sqm) && rt.sqm > 0) {
      work.sqmSum += rt.sqm;
      work.sqmN += 1;
    }
    if (typeof rt.count === "number" && Number.isFinite(rt.count) && rt.count > 0) {
      work.unitsSum += rt.count;
      work.unitsHas = true;
    }
  }
  for (const [key, w] of sumByKey.entries()) {
    const row = rowByKey.get(key)!;
    row.avg_sqm = w.sqmN > 0 ? Math.round((w.sqmSum / w.sqmN) * 10) / 10 : null;
    row.total_units = w.unitsHas ? w.unitsSum : null;
  }

  const type_count_total = room_types.length;
  let total_units: number | null = null;
  for (const r of rows) {
    if (r.total_units != null) total_units = (total_units ?? 0) + r.total_units;
  }
  return { rows, type_count_total, total_units };
}
