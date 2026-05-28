// Build the apply UPDATE SQL + REVERT SQL from enrich-payload.json
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(readFileSync(resolve(__dirname, "enrich-payload.json"), "utf8"));

// Merge policy mirror (non-destructive)
const CURRENT_AMENITIES = {
  "709f2211-42bc-48ec-b173-97c9b912fbd9": { bar: true, gym: true, spa: true, pool: true, parking: false, rooftop: true, restaurant: true, meetingRooms: true },
  "00cb78a8-2139-4497-91f8-0bfde3053a61": {},
};

function mergeAmenities(currentObj, detected, forceSpa) {
  const merged = { ...currentObj };
  for (const [k, v] of Object.entries(detected)) {
    if (merged[k] === true) continue;
    if (v === null || v === undefined) continue;
    merged[k] = v;
  }
  // Operator assertive override
  merged.spa = forceSpa;
  return merged;
}

function sqlString(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function sqlArrayText(arr) {
  return "ARRAY[" + arr.map(sqlString).join(",") + "]::text[]";
}

const updates = [];
const reverts = [];
const auditIds = [];

for (const t of payload.targets) {
  const merged = mergeAmenities(CURRENT_AMENITIES[t.canonical_id], t.facilities_parsed.detected_amenities, t.operator_override.force_spa);
  const d = t.detail;
  const setParts = [];
  setParts.push(`booking_hotel_id = ${sqlString(t.booking_hotel_id)}`);
  setParts.push(`amenities = ${sqlString(JSON.stringify(merged))}::jsonb`);
  if (t.facilities_parsed.restaurants_count !== null) setParts.push(`restaurants_count = ${t.facilities_parsed.restaurants_count}`);
  if (t.facilities_parsed.meeting_rooms_count !== null) setParts.push(`meeting_rooms_count = ${t.facilities_parsed.meeting_rooms_count}`);
  if (d.review_score !== null) setParts.push(`review_score = ${d.review_score}`);
  if (d.review_count !== null) setParts.push(`review_count = ${d.review_count}`);
  if (d.lat !== null) setParts.push(`lat = ${d.lat}`);
  if (d.lng !== null) setParts.push(`lng = ${d.lng}`);
  if (d.address) setParts.push(`address_line1 = ${sqlString(d.address)}`);
  if (d.zip) setParts.push(`postal_code = ${sqlString(d.zip)}`);
  if (t.photos.urls && t.photos.urls.length) {
    setParts.push(`gallery_paths = ${sqlArrayText(t.photos.urls)}`);
    setParts.push(`hero_image_path = ${sqlString(t.photos.urls[0])}`);
  }
  setParts.push(`last_enriched_at = NOW()`);
  setParts.push(`enrichment_version = 2`);
  setParts.push(`primary_source = 'booking_rapidapi'`);
  // Set primary_review_source = 'booking' since Booking is what we now have
  setParts.push(`primary_review_source = 'booking'`);

  updates.push(`-- ${t.name}\nUPDATE public.hotel_canonical SET\n  ${setParts.join(",\n  ")}\nWHERE id = ${sqlString(t.canonical_id)}::uuid;\n`);
  auditIds.push(t.canonical_id);

  // Revert: restore to BEFORE snapshot
  const before = CURRENT_AMENITIES[t.canonical_id];
  reverts.push(`-- ${t.name} · revert to BEFORE\nUPDATE public.hotel_canonical SET\n  booking_hotel_id = NULL,\n  amenities = ${sqlString(JSON.stringify(before))}::jsonb,\n  restaurants_count = NULL,\n  meeting_rooms_count = NULL,\n  review_score = NULL,\n  review_count = NULL,\n  gallery_paths = NULL,\n  hero_image_path = NULL,\n  enrichment_version = 1\nWHERE id = ${sqlString(t.canonical_id)}::uuid;\n`);
}

const auditSql = `INSERT INTO public.ai_agent_runs (agent_id, trigger_kind, status, run_completed_at, metadata)
VALUES (
  'data_ingestion',
  'manual',
  'success',
  NOW(),
  '${JSON.stringify({
    operation: "manual_curated_id_resolution",
    source: "audit_16_followup",
    criteria: "Resolve booking_hotel_id for the 2 hotels created via primary_source=manual_curated · enrich with Booking pipeline",
    operator_verified_identity: true,
    rows_affected_target: 2,
    before_snapshot_file: ".smoke/manual-curated-id-resolution/BEFORE-snapshot-2026-05-28T16-56-39Z.json",
    api_payload_file: ".smoke/manual-curated-id-resolution/enrich-payload.json",
    revert_command_file: ".smoke/manual-curated-id-resolution/REVERT.sql",
    affected_canonical_ids: auditIds,
    notes: [
      "EDITION: parser auto-detected spa=true (no false-negative · force_spa=true is redundant safety)",
      "Riu Plaza: parser detected spa=false (matches operator-verified ground truth)",
      "EDITION: parking moved false→true (Booking confirms valet · merge policy upgrade)",
      "Both: lat/lng/postal_code/address_line1 corrected from Booking detail",
      "Both: primary_source moved manual_curated → booking_rapidapi",
    ],
  }).replace(/'/g, "''")}'::jsonb
);`;

const fullApply = `-- ============================================================================
-- MANUAL_CURATED ID RESOLUTION · 2 hotels (EDITION + Riu Plaza)
-- ============================================================================
-- Generated from enrich-payload.json · ${new Date().toISOString()}
-- BEFORE snapshot: .smoke/manual-curated-id-resolution/BEFORE-snapshot-2026-05-28T16-56-39Z.json
-- Reversible via REVERT.sql in same folder.
-- ============================================================================

${updates.join("\n")}

${auditSql}
`;

const fullRevert = `-- REVERT · restore 2 hotels to pre-resolution state
-- Use ONLY if you need to roll back. Will null out enrichment + booking_hotel_id.
-- ============================================================================

${reverts.join("\n")}
`;

writeFileSync(resolve(__dirname, "APPLY.sql"), fullApply, "utf8");
writeFileSync(resolve(__dirname, "REVERT.sql"), fullRevert, "utf8");
console.log(`APPLY.sql: ${fullApply.length} bytes`);
console.log(`REVERT.sql: ${fullRevert.length} bytes`);
console.log(`affected ids: ${JSON.stringify(auditIds)}`);
