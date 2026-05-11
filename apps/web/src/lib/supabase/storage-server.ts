// Server-only Supabase Storage helpers.
//
// These run under the service-role client and bypass RLS — call them
// only from Server Actions / Route Handlers that have already verified
// the caller is allowed to see the object.
//
// The browser counterpart (`storage.ts`) covers everything that should
// run as the authenticated user.

import "server-only";
import { getSupabaseAdmin } from "./admin";
import type { StorageBucket } from "./storage";

/**
 * Default signed-URL lifetime — 5 minutes. Long enough for a click-and-
 * download flow, short enough that a leaked URL stops working before it
 * can be shared.
 */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

export interface SignedUrlOptions {
  /** Seconds the URL is valid. Defaults to `DEFAULT_SIGNED_URL_TTL_SECONDS`. */
  expiresInSeconds?: number;
  /**
   * When set, instructs the storage edge to return the file with a
   * `Content-Disposition: attachment; filename=...` header. Use for
   * "Download PDF" CTAs where the browser should not render inline.
   */
  downloadAs?: string;
}

/**
 * Mint a time-limited signed URL for a private bucket object. The caller
 * is responsible for confirming the user has permission to view the
 * object (e.g. by joining through `public.valuations.owner_id`).
 */
export async function createStorageSignedUrl(
  bucket: StorageBucket,
  path: string,
  options: SignedUrlOptions = {},
): Promise<string> {
  const admin = getSupabaseAdmin();
  const ttl = options.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, ttl, options.downloadAs ? { download: options.downloadAs } : undefined);
  if (error) throw new Error(`Storage signed-URL failed (${bucket}/${path}): ${error.message}`);
  return data.signedUrl;
}

/**
 * Batch variant — issues `createSignedUrls` in a single round-trip.
 * Returns the same array order as the input paths; entries with an
 * error are surfaced as `null` to keep alignment.
 */
export async function createStorageSignedUrls(
  bucket: StorageBucket,
  paths: string[],
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<Array<string | null>> {
  if (paths.length === 0) return [];
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrls(paths, expiresInSeconds);
  if (error) throw new Error(`Storage batch signed-URL failed (${bucket}): ${error.message}`);
  const byPath = new Map(data.map((row) => [row.path ?? "", row.signedUrl ?? null]));
  return paths.map((p) => byPath.get(p) ?? null);
}

/**
 * Move an object from one path to another, both inside the same bucket.
 * Service-role is required because the caller may be moving across user
 * namespaces (e.g. completing a PDF render).
 */
export async function moveStorageObject(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(bucket).move(fromPath, toPath);
  if (error) throw new Error(`Storage move failed (${bucket}: ${fromPath} → ${toPath}): ${error.message}`);
}

/**
 * Service-role delete — bypasses RLS. Use from cleanup jobs or when a
 * parent row (e.g. `public.report_files`) is being removed with a hard
 * cascade.
 */
export async function deleteStorageObjectsAsAdmin(
  bucket: StorageBucket,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(bucket).remove(paths);
  if (error) throw new Error(`Storage admin delete failed (${bucket}): ${error.message}`);
}
