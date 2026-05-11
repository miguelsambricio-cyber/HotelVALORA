// Supabase — browser-safe barrel.
//
// IMPORTANT: this barrel only re-exports modules that are safe to bundle
// into client components. Server-only modules MUST be imported directly:
//
//   import { createServerSupabaseClient } from "@/lib/supabase/server";
//   import { getSupabaseAdmin }           from "@/lib/supabase/admin";
//   import { getSupabaseUser }            from "@/lib/supabase/auth-helpers";
//   import { updateSupabaseSession }      from "@/lib/supabase/middleware";
//
// They carry `import "server-only"` and / or pull in `next/headers`;
// re-exporting them from here would poison every client bundle that
// touches the barrel because webpack traces the entire module graph
// before tree-shaking.

export { createBrowserSupabaseClient } from "./client";
export type { Database } from "./types";

// Storage — browser-safe primitives. Server-only helpers (signed URLs,
// admin moves/deletes) live in `./storage-server` and are imported
// directly there.
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
