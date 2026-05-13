#!/usr/bin/env node
/**
 * Upload services/costar/MASTER/snapshot.json to Supabase Storage so the
 * production deploy on Vercel can read it without the file being in git.
 *
 * Pattern: institutional data plane stays out of git; the runtime
 * snapshot lives in a private Supabase bucket; only service-role
 * downloads (the Next.js server) can fetch it.
 *
 * Usage (from apps/web/):
 *   node --env-file=.env.local scripts/upload-snapshot.mjs
 *
 * Run after every `python services/costar/scripts/ingest.py` so the
 * production UI reflects the latest ingestion.
 *
 * Required env vars (loaded from apps/web/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SNAPSHOT_PATH = path.join(REPO_ROOT, "services", "costar", "MASTER", "snapshot.json");

const BUCKET = "costar-master";
const OBJECT_KEY = "snapshot.json";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "✗ Missing env. Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Run from apps/web/ with `--env-file=.env.local` so dotenv loads.",
  );
  process.exit(2);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureBucket() {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw new Error(`storage.listBuckets failed: ${listErr.message}`);
  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`✓ bucket "${BUCKET}" already exists`);
    return;
  }
  console.log(`✱ creating bucket "${BUCKET}" (private)...`);
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: false,
  });
  if (createErr) throw new Error(`storage.createBucket failed: ${createErr.message}`);
  console.log(`✓ bucket "${BUCKET}" created`);
}

async function upload() {
  let st;
  try {
    st = await stat(SNAPSHOT_PATH);
  } catch {
    console.error(`✗ snapshot.json not found at ${SNAPSHOT_PATH}`);
    console.error(`  Run \`python services/costar/scripts/ingest.py\` first.`);
    process.exit(1);
  }
  console.log(`✱ reading ${SNAPSHOT_PATH} (${st.size.toLocaleString()} bytes)...`);
  const buf = await readFile(SNAPSHOT_PATH);

  console.log(`✱ uploading to ${BUCKET}/${OBJECT_KEY}...`);
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(OBJECT_KEY, buf, {
      contentType: "application/json",
      cacheControl: "60",
      upsert: true,
    });
  if (uploadErr) throw new Error(`storage.upload failed: ${uploadErr.message}`);
  console.log(`✓ uploaded ${BUCKET}/${OBJECT_KEY}`);
}

async function verify() {
  // Round-trip read to confirm the snapshot is accessible to the runtime
  const { data, error } = await supabase.storage.from(BUCKET).download(OBJECT_KEY);
  if (error) throw new Error(`storage.download verify failed: ${error.message}`);
  const text = await data.text();
  const parsed = JSON.parse(text);
  console.log(
    `✓ verified · schema=${parsed.schema_version} · batch=${parsed.ingestion_batch_id} ` +
      `· hotels=${parsed.hotels?.length ?? 0} · transactions=${parsed.transactions?.length ?? 0} ` +
      `· synthetic_compsets=${parsed.synthetic_compsets?.length ?? 0}`,
  );
}

(async () => {
  try {
    await ensureBucket();
    await upload();
    await verify();
    console.log("\nDONE. The production /user/admin/hotels page will pick this up on next request.");
  } catch (err) {
    console.error("\n✗ FAILED:", err.message);
    process.exit(1);
  }
})();
