// Supabase — barrel surface.
//
// Client exports are environment-specific:
//   - browser  → createBrowserSupabaseClient()    (use in client components)
//   - server   → createServerSupabaseClient()     (RSC / actions / route handlers)
//   - middleware → updateSupabaseSession()        (called from middleware.ts)
//   - admin    → getSupabaseAdmin()               (service-role, server-only)
//
// Auth helpers live in `auth-helpers.ts` — they read the server client.

export { createBrowserSupabaseClient } from "./client";
export { createServerSupabaseClient } from "./server";
export { updateSupabaseSession } from "./middleware";
export { getSupabaseAdmin } from "./admin";

export {
  getSupabaseUser,
  requireSupabaseUser,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from "./auth-helpers";
export type { SupabaseUser } from "./auth-helpers";

export type { Database } from "./types";

// Storage — browser-safe surface. Server-only helpers (signed URLs,
// move/delete as admin) live in `./storage-server` and must never be
// re-exported from this barrel.
export {
  BUCKETS,
  ownPath,
  timestampedName,
  validateForBucket,
  uploadOwnFile,
  deleteOwnFiles,
  listOwnFiles,
  getPublicUrl,
} from "./storage";
export type {
  StorageBucket,
  StorageBucketSpec,
  StorageValidationError,
  UploadResult,
  UploadOptions,
} from "./storage";
