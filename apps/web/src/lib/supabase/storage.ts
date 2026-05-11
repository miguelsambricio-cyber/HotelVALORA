// Typed Supabase Storage helpers — browser-safe primitives.
//
// Conventions
// ───────────
// Every bucket follows the same path layout:
//
//   {bucketId}/{auth.uid()}/{rest...}
//
// The first folder is the caller's user id. RLS on `storage.objects`
// enforces it (see `docs/database/migrations/0003_storage_buckets_and_policies.sql`),
// so an authenticated client can only read/write inside its own
// namespace without any extra logic on the client.
//
// Public reads
// ────────────
// Only the `avatars` bucket is public. For every other bucket, hand the
// path off to `createStorageSignedUrl()` (see `storage-server.ts`) — that
// runs server-side with the service-role key and returns a time-limited
// URL.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type StorageBucket =
  | "reports"
  | "pdfs"
  | "excel-uploads"
  | "renders"
  | "avatars";

export interface StorageBucketSpec {
  /** Bucket id as stored in `storage.buckets` */
  id: StorageBucket;
  /** Public-read flag. Mirrors the DB row exactly. */
  public: boolean;
  /** Hard size cap enforced by the bucket — keep in sync with migration 0003. */
  maxBytes: number;
  /** Allowed MIME types. `null` means "any". */
  mimes: readonly string[] | null;
  /** One-line description of what the bucket holds. */
  description: string;
}

/**
 * Canonical bucket catalog. Mirrors `storage.buckets` (migration 0003)
 * and is the only source of truth on the frontend for size / MIME
 * checks — keep in lock-step.
 */
export const BUCKETS: Record<StorageBucket, StorageBucketSpec> = {
  reports: {
    id: "reports",
    public: false,
    maxBytes: 50 * 1024 * 1024,
    mimes: null,
    description: "Files attached to a valuation (deal docs, photos, contracts).",
  },
  pdfs: {
    id: "pdfs",
    public: false,
    maxBytes: 100 * 1024 * 1024,
    mimes: ["application/pdf"],
    description: "Generated valuation PDFs. Always signed URL on delivery.",
  },
  "excel-uploads": {
    id: "excel-uploads",
    public: false,
    maxBytes: 25 * 1024 * 1024,
    mimes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    description: "Excel ingestion workbooks. Uploader-only.",
  },
  renders: {
    id: "renders",
    public: false,
    maxBytes: 10 * 1024 * 1024,
    mimes: ["image/png", "image/jpeg", "image/webp"],
    description: "AI-generated marketing renders. Signed URL on render.",
  },
  avatars: {
    id: "avatars",
    public: true,
    maxBytes: 5 * 1024 * 1024,
    mimes: ["image/png", "image/jpeg", "image/webp"],
    description: "Profile photos. Public CDN, owner-only writes.",
  },
};

// ─── Path conventions ───────────────────────────────────────────────────────

/**
 * Build a storage path that lives in the caller's RLS-protected
 * namespace: `{userId}/{...parts}`. Empty parts are dropped.
 */
export function ownPath(userId: string, ...parts: string[]): string {
  return [userId, ...parts.filter(Boolean)].join("/");
}

/**
 * Time-stamp a filename so re-uploading the same file does not collide.
 * Strips the leading dot and lowercases the extension.
 */
export function timestampedName(originalName: string): string {
  const dotIdx = originalName.lastIndexOf(".");
  const stem = dotIdx >= 0 ? originalName.slice(0, dotIdx) : originalName;
  const ext = dotIdx >= 0 ? originalName.slice(dotIdx + 1).toLowerCase() : "bin";
  const safeStem = stem.replace(/[^\w.-]+/g, "-").slice(0, 80);
  return `${Date.now()}-${safeStem}.${ext}`;
}

// ─── Client-side validation ─────────────────────────────────────────────────

export interface StorageValidationError {
  code: "size_too_large" | "mime_not_allowed";
  message: string;
}

/**
 * Cheap client-side guard. The bucket also enforces both limits server-side,
 * but failing fast in the browser is a much better UX than waiting for a
 * 400 from Storage.
 */
export function validateForBucket(
  bucket: StorageBucket,
  file: { size: number; type: string },
): StorageValidationError | null {
  const spec = BUCKETS[bucket];
  if (file.size > spec.maxBytes) {
    return {
      code: "size_too_large",
      message: `File exceeds the ${formatBytes(spec.maxBytes)} limit for "${bucket}".`,
    };
  }
  if (spec.mimes && !spec.mimes.includes(file.type)) {
    return {
      code: "mime_not_allowed",
      message: `MIME "${file.type}" is not allowed in "${bucket}". Accepted: ${spec.mimes.join(", ")}.`,
    };
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// ─── Upload / delete / move ─────────────────────────────────────────────────

export interface UploadResult {
  /** Storage object key — pass to signed-URL or public-URL helpers. */
  path: string;
  /** Bucket the object landed in. */
  bucket: StorageBucket;
}

export interface UploadOptions {
  /** Override the auto-generated filename. Will be prefixed with `userId/`. */
  filename?: string;
  /** When true, an existing object at the same path is replaced. */
  upsert?: boolean;
  /** MIME override (defaults to `file.type`). */
  contentType?: string;
  /** Optional subfolder under `userId/` — useful for grouping (e.g. valuationId). */
  subfolder?: string;
}

/**
 * Upload a file into the caller's namespace inside `bucket`.
 *
 * The supplied `userId` MUST equal the authenticated user's id —
 * `storage.objects` RLS rejects any other path. Pass the value you have
 * locally (e.g. from `useSupabaseUser()` or `requireSupabaseUser()`).
 */
export async function uploadOwnFile(
  client: SupabaseClient<Database>,
  bucket: StorageBucket,
  userId: string,
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const validation = validateForBucket(bucket, file);
  if (validation) throw new Error(validation.message);

  const filename = options.filename ?? timestampedName(file.name);
  const path = options.subfolder
    ? ownPath(userId, options.subfolder, filename)
    : ownPath(userId, filename);

  const { error } = await client.storage.from(bucket).upload(path, file, {
    upsert: options.upsert ?? false,
    contentType: options.contentType ?? file.type,
  });
  if (error) throw new Error(`Storage upload failed (${bucket}): ${error.message}`);

  return { path, bucket };
}

/**
 * Remove one or more objects from `bucket`. Caller must own them
 * (RLS enforced).
 */
export async function deleteOwnFiles(
  client: SupabaseClient<Database>,
  bucket: StorageBucket,
  paths: string[],
): Promise<void> {
  const { error } = await client.storage.from(bucket).remove(paths);
  if (error) throw new Error(`Storage delete failed (${bucket}): ${error.message}`);
}

/**
 * List objects inside the caller's own folder of `bucket`. Subfolder
 * filters scope further (e.g. `subfolder = valuationId`).
 */
export async function listOwnFiles(
  client: SupabaseClient<Database>,
  bucket: StorageBucket,
  userId: string,
  subfolder?: string,
) {
  const prefix = subfolder ? ownPath(userId, subfolder) : userId;
  const { data, error } = await client.storage
    .from(bucket)
    .list(prefix, { sortBy: { column: "created_at", order: "desc" } });
  if (error) throw new Error(`Storage list failed (${bucket}): ${error.message}`);
  return data ?? [];
}

// ─── Public URL (avatars only) ──────────────────────────────────────────────

/**
 * Return the public CDN URL for an object in a public bucket.
 *
 * Only `avatars` is public today. The function intentionally narrows the
 * type so private buckets cannot be passed.
 */
export function getPublicUrl(
  client: SupabaseClient<Database>,
  bucket: Extract<StorageBucket, "avatars">,
  path: string,
): string {
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
